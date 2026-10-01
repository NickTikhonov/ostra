import type { DisplayState } from '@/modules/types';
import type { Patch } from './modules';
import type { ProbeTarget, ScopeFrame } from './scope';
import { getSample } from './sample-assets';

export class AudioEngine {
  context: AudioContext | null = null;
  node: AudioWorkletNode | null = null;
  gain: GainNode | null = null;
  onState?: (modules: Record<string, DisplayState>) => void;
  onScope?: (frame: ScopeFrame) => void;
  onError?: (message: string) => void;
  onStopped?: () => void;
  private signature = '';
  private wantedAssets = new Set<string>();
  private loadedAssets = new Set<string>();
  private failedAssets = new Set<string>();
  private loadingAssets = new Map<string, Promise<void>>();
  private probeTarget: ProbeTarget | null = null;

  async start(patch: Patch) {
    if (!this.context) {
      const ctx = new AudioContext({ latencyHint: 'interactive' });
      this.context = ctx;
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
        };
      } catch (error) {
        if (this.context === ctx) await this.close();
        throw error;
      }
    }
    // Retry missing files on an explicit restart, not on every knob movement.
    this.failedAssets.clear();
    this.update(patch);
    await this.syncAssets();
    const context = this.context;
    if (!context) throw new Error('Audio stopped during startup. Press Play to retry.');
    this.probe(this.probeTarget);
    await context.resume();
    if (this.context !== context)
      throw new Error('Audio stopped during startup. Press Play to retry.');
    this.gain!.gain.setTargetAtTime(1, context.currentTime, 0.02);
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
  probe(target: ProbeTarget | null) {
    this.probeTarget = target;
    this.node?.port.postMessage({ type: 'probe', target });
  }
  async stop() {
    const context = this.context;
    if (!context) return;
    this.gain?.gain.setTargetAtTime(0, context.currentTime, 0.01);
    await new Promise((resolve) => setTimeout(resolve, 60));
    if (this.context === context) await context.suspend();
  }
  async close() {
    const context = this.context,
      node = this.node,
      gain = this.gain;
    this.context = null;
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
