// @ts-check
import { clamp } from '../../audio/dsp.js';
/** @satisfies {import('../types').ModuleProcessor<{ic1:number;ic2:number}>} */
const processor = {
  createState: () => ({ ic1: 0, ic2: 0 }),
  process({ params: p, inputs, connected, outputs, state: s, sampleRate: sr }) {
    const f = clamp(p.cutoff * Math.pow(2, (inputs.cutoff / 5) * p.depth), 20, sr * 0.42);
    const g = Math.tan((Math.PI * f) / sr),
      k = 2 - 1.9 * p.resonance,
      a = 1 / (1 + g * (g + k));
    const v0 = Math.tanh(inputs.in / 5) * 5;
    const v1 = a * (s.ic1 + g * (v0 - s.ic2)),
      v2 = s.ic2 + g * v1;
    s.ic1 = 2 * v1 - s.ic1;
    s.ic2 = 2 * v2 - s.ic2;
    const gain = connected.vca ? clamp(inputs.vca / 5, 0, 1) : 1;
    outputs.low = v2 * gain;
    outputs.band = v1;
    outputs.high = v0 - k * v1 - v2;
    if (!Number.isFinite(outputs.low + outputs.band + outputs.high)) {
      outputs.low = 0;
      outputs.band = 0;
      outputs.high = 0;
      s.ic1 = 0;
      s.ic2 = 0;
    }
  },
};
export default processor;
