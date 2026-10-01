// @ts-check
import { clamp, TAU } from '../../audio/dsp.js';
/** @satisfies {import('../types').ModuleProcessor<{phase:number;reset:boolean}>} */
const processor = {
  createState: () => ({ phase: 0, reset: false }),
  process({ inputs: i, params: p, outputs: o, state: s, sampleRate: sr }) {
    const reset = i.reset > 1;
    if (reset && !s.reset) s.phase = 0;
    s.reset = reset;
    const t = s.phase;
    s.phase = (t + clamp(p.rate * Math.pow(2, i.rate), 0.001, 100) / sr) % 1;
    const gain = p.polarity > 0.5 ? p.depth * 0.5 : p.depth,
      offset = p.polarity > 0.5 ? gain : 0;
    o.sine = Math.sin(t * TAU) * gain + offset;
    o.triangle = (1 - 4 * Math.abs(t - 0.5)) * gain + offset;
    o.square = (t < 0.5 ? 1 : -1) * gain + offset;
  },
};
export default processor;
