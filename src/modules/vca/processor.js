// @ts-check
import { clamp } from '../../audio/dsp.js';
/** @satisfies {import('../types').ModuleProcessor<Record<string,never>>} */
const processor = {
  createState: () => ({}),
  process({ inputs: i, params: p, outputs: o }) {
    const linear = clamp(p.gain + (i.cv / 5) * p.depth, 0, 1),
      exponential = Math.expm1(linear * 4) / Math.expm1(4);
    o.out = i.in * (linear + (exponential - linear) * p.curve);
    const linear2 = clamp(p.gain2 + (i.cv2 / 5) * p.depth2, 0, 1),
      exponential2 = Math.expm1(linear2 * 4) / Math.expm1(4);
    o.out2 = i.in2 * (linear2 + (exponential2 - linear2) * p.curve2);
  },
};
export default processor;
