// @ts-check
import { clamp } from '../../audio/dsp.js';
/** @satisfies {import('../types').ModuleProcessor<Record<string,never>>} */
const processor = {
  createState: () => ({}),
  process({ params: p, inputs: i, outputs: o }) {
    const amount = p.mode > 0.5 ? p.amount * 2 - 1 : p.amount;
    o.out1 = o.out2 = clamp(p.offset + i.in * amount, -10, 10);
  },
};
export default processor;
