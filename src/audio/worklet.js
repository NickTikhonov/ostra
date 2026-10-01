// @ts-check
import { RackEngine } from './engine.js';
class ModularProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.engine = new RackEngine(sampleRate);
    this.frames = 0;
    this.failed = false;
    this.port.onmessage = ({ data }) => {
      if (this.failed) return;
      try {
        if (data.type === 'patch') this.engine.setPatch(data.patch);
        if (data.type === 'event') this.engine.dispatch(data.id, data.event);
        if (data.type === 'probe') this.engine.setProbe(data.target);
        if (data.type === 'asset') this.engine.setAsset(data.id, data.asset);
      } catch (error) {
        this.fail(error);
      }
    };
  }
  /** @param {unknown} error */
  fail(error) {
    if (this.failed) return;
    this.failed = true;
    const module = this.engine.activeModule;
    this.port.postMessage({
      type: 'error',
      message: `${module ? `${module.type} (${module.id})` : 'Audio engine'}: ${error instanceof Error ? error.message : 'processor failed'}`,
    });
  }
  /** @param {Float32Array[][]} _inputs @param {Float32Array[][]} outputs */
  process(_inputs, outputs) {
    const out = outputs[0];
    if (!out || out.length < 2) return true;
    if (!this.failed) {
      try {
        this.engine.render(out[0], out[1]);
        this.frames += out[0].length;
        if (this.frames >= sampleRate / 24) {
          this.frames = 0;
          this.port.postMessage({ type: 'state', modules: this.engine.getDisplayState() });
          const frame = this.engine.getProbeFrame();
          if (frame) this.port.postMessage({ type: 'scope', frame });
        }
      } catch (error) {
        this.fail(error);
      }
    }
    // Zero the entire block, including samples written before the exception.
    if (this.failed) for (const channel of out) channel.fill(0);
    return true;
  }
}
registerProcessor('modular-engine', ModularProcessor);
