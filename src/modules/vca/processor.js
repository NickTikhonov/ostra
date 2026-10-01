// @ts-check
import { clamp } from '../../audio/dsp.js';
/** @satisfies {import('../types').ModuleProcessor<Record<string,never>>} */
const processor = {
  createState: () => ({}),
  process({ inputs: i, params: p, outputs: o }) {
    const linear = clamp(p.gain + (i.cv / 5) * p.depth, 0, 1),
      exponential = Math.expm1(linear * 4) / Math.expm1(4);
    o.out = i.in * (linear + (exponential - linear) * p.curve);
  },
};
export default processor;
