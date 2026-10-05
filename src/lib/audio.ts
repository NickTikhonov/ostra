import type { DisplayState } from '@/modules/types';
import type { Patch } from './modules';
import type { ProbeTarget, ScopeFrame } from './scope';
import { getSample } from './sample-assets';
import { recordingWav } from './wav';

export class AudioEngine {
  context: AudioContext | null = null;
  node: AudioWorkletNode | null = null;
  gain: GainNode | null = null;
  onState?: (modules: Record<string, DisplayState>) => void;
  onScope?: (frame: ScopeFrame) => void;
  onError?: (message: string) => void;
  onStopped?: () => void;
  onRunning?: (running: boolean) => void;
  onRecordingProgress?: (seconds: number) => void;
  onRecordingComplete?: (wav: Blob, reason: string) => void;
  private recording: { chunks: ArrayBuffer[]; sampleRate: number } | null = null;
  private recordingStop: Promise<void> | null = null;
  private resolveRecording?: () => void;
  private signature = '';
  private wantedAssets = new Set<string>();
  private loadedAssets = new Set<string>();
  private failedAssets = new Set<string>();
  private loadingAssets = new Map<string, Promise<void>>();
  private probeTarget: ProbeTarget | null = null;

  private muted = false;
  private initializing: Promise<void> | null = null;

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.context)
      this.gain?.gain.setTargetAtTime(muted ? 0 : 1, this.context.currentTime, 0.02);
  }

  private async initialize() {
    if (!this.context) {
      const ctx = new AudioContext({ latencyHint: 'interactive' });
      this.context = ctx;
      ctx.onstatechange = () => {
        if (this.context === ctx) this.onRunning?.(ctx.state === 'running');
      };
      try {
        await ctx.audioWorklet.addModule('/runtime/audio/worklet.js');
        if (this.context !== ctx) throw new Error('Audio startup was cancelled.');
        const node = new AudioWorkletNode(ctx, 'modular-engine', {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [2],
        });
        this.node = node;
        this.gain = ctx.createGain();
        this.gain.gain.value = 0;
        node.connect(this.gain);
        this.gain.connect(ctx.destination);
        node.onprocessorerror = () => this.fail(node, 'Audio processor failed.');
        node.port.onmessage = ({ data }) => {
          if (this.node !== node) return;
          if (data.type === 'state') this.onState?.(data.modules);
          if (data.type === 'scope') this.onScope?.(data.frame);
          if (data.type === 'error') this.fail(node, data.message);
          if (data.type === 'recording-chunk' && this.recording) {
            this.recording.chunks.push(data.chunk);
            this.onRecordingProgress?.(data.frames / this.recording.sampleRate);
          }
          if (data.type === 'recording-done') this.completeRecording(data.reason);
        };
      } catch (error) {
        if (this.context === ctx) await this.close();
        throw error;
      }
    }
  }

  async start(patch: Patch, automatic = false) {
    // iOS treats Web Audio as ambient by default, so the ring/silent switch
    // can mute a running synth. Claim media playback only on an explicit start,
    // before creating/resuming the context; the muted welcome must not take it.
    // https://bugs.webkit.org/show_bug.cgi?id=237322
    if (!automatic && typeof navigator !== 'undefined') {
      try {
        const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
        if (session) session.type = 'playback';
      } catch {
        // This optional API is absent or restricted in some browsers/webviews.
        // Keep ordinary gesture-initiated Web Audio working there.
      }
    }
    if (!this.initializing) this.initializing = this.initialize();
    const initializing = this.initializing;
    // Request resume during the gesture, before waiting for the worklet to load.
    // Autoplay may leave this promise pending until the visitor interacts.
    const resumed = this.context ? this.context.resume() : Promise.resolve();
    void resumed.catch(() => {});
    try {
      await initializing;
    } finally {
      if (this.initializing === initializing) this.initializing = null;
    }
    // Retry missing files on an explicit restart, not on every knob movement.
    this.failedAssets.clear();
    this.update(patch);
    await this.syncAssets();
    const context = this.context;
    if (!context) throw new Error('Audio stopped during startup. Press Play to retry.');
    this.probe(this.probeTarget);
    if (!automatic) await resumed;
    if (this.context !== context)
      throw new Error('Audio stopped during startup. Press Play to retry.');
    this.setMuted(this.muted);
    this.onRunning?.(context.state === 'running');
  }

  private fail(node: AudioWorkletNode, message: string) {
    if (this.node !== node) return;
    // Disconnect synchronously. A failed worklet cannot be resumed; the next
    // user-initiated start creates a new context, node and asset cache.
    void this.close().catch(() => {});
    this.onStopped?.();
    this.onError?.(
      `${message} Audio stopped. Press Play to retry; remove the failing module if it repeats.`,
    );
  }

  update(patch: Patch) {
    if (!this.node) return;
    const signature = JSON.stringify({
      modules: patch.modules.map(({ id, type, params, data }) => ({ id, type, params, data })),
      cables: patch.cables,
      output: patch.output,
    });
    if (signature === this.signature) return;
    this.signature = signature;
    this.node.port.postMessage({ type: 'patch', patch });
    this.wantedAssets = new Set(
      patch.modules
        .map((m) => m.data.assetId)
        .filter((id): id is string => typeof id === 'string' && !!id),
    );
    for (const id of this.loadedAssets) {
      if (!this.wantedAssets.has(id)) {
        this.node.port.postMessage({ type: 'asset', id, asset: null });
        this.loadedAssets.delete(id);
      }
    }
    for (const id of this.failedAssets)
      if (!this.wantedAssets.has(id)) this.failedAssets.delete(id);
    void this.syncAssets();
  }

  private async syncAssets() {
    const node = this.node;
    if (!node) return;
    await Promise.all(
      [...this.wantedAssets].map((id) => {
        if (this.loadedAssets.has(id) || this.failedAssets.has(id)) return;
        const pending = this.loadingAssets.get(id);
        if (pending) return pending;
        const loading = getSample(id)
          .then((sample) => {
            if (this.node !== node || !this.wantedAssets.has(id)) return;
            if (!sample)
              throw new Error('A saved sample is missing. Drop the file onto GRAIN again.');
            node.port.postMessage(
              {
                type: 'asset',
                id,
                asset: { sampleRate: sample.sampleRate, channels: sample.channels },
              },
              sample.channels.map((c) => c.buffer as ArrayBuffer),
            );
            this.loadedAssets.add(id);
          })
          .catch((error) => {
            if (this.node !== node || !this.wantedAssets.has(id)) return;
            this.failedAssets.add(id);
            this.onError?.(error instanceof Error ? error.message : 'Could not load sample.');
            // Leave this sampler empty; an unavailable file must not stop other voices.
          })
          .finally(() => {
            if (this.loadingAssets.get(id) === loading) this.loadingAssets.delete(id);
          });
        this.loadingAssets.set(id, loading);
        return loading;
      }),
    );
  }

  trigger(id: string, event: string) {
    this.node?.port.postMessage({ type: 'event', id, event });
  }
  startRecording() {
    if (!this.node || !this.context || this.context.state !== 'running')
      throw new Error('Start the transport before recording.');
    if (this.recording) return;
    this.recording = { chunks: [], sampleRate: this.context.sampleRate };
    this.recordingStop = null;
    this.node.port.postMessage({ type: 'record-start' });
  }
  stopRecording(): Promise<void> {
    if (!this.recording) return Promise.resolve();
    if (this.recordingStop) return this.recordingStop;
    this.recordingStop = new Promise((resolve) => {
      const timeout = setTimeout(() => this.completeRecording('interrupted'), 3000);
      this.resolveRecording = () => {
        clearTimeout(timeout);
        resolve();
      };
      this.node?.port.postMessage({ type: 'record-stop' });
    });
    return this.recordingStop;
  }
  private completeRecording(reason: string) {
    const recording = this.recording;
    this.recording = null;
    this.resolveRecording?.();
    this.resolveRecording = undefined;
    this.recordingStop = null;
    if (recording)
      this.onRecordingComplete?.(recordingWav(recording.chunks, recording.sampleRate), reason);
  }
  probe(target: ProbeTarget | null) {
    this.probeTarget = target;
    this.node?.port.postMessage({ type: 'probe', target });
  }
  async stop() {
    await this.stopRecording();
    const context = this.context;
    if (!context) return;
    this.gain?.gain.setTargetAtTime(0, context.currentTime, 0.01);
    await new Promise((resolve) => setTimeout(resolve, 60));
    if (this.context === context) await context.suspend();
  }
  async close() {
    this.completeRecording('interrupted');
    const context = this.context,
      node = this.node,
      gain = this.gain;
    this.context = null;
    this.initializing = null;
    if (context) context.onstatechange = null;
    this.node = null;
    this.gain = null;
    this.signature = '';
    this.loadedAssets.clear();
    this.failedAssets.clear();
    this.loadingAssets.clear();
    this.wantedAssets.clear();
    if (node) {
      node.onprocessorerror = null;
      node.port.onmessage = null;
      node.disconnect();
      node.port.close();
    }
    gain?.disconnect();
    await context?.close();
  }
}
