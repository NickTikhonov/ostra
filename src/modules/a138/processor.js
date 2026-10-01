// @ts-check
import { clamp } from '../../audio/dsp.js';
/** @satisfies {import('../types').ModuleProcessor<Record<string,never>>} */
const processor = {
  createState: () => ({}),
  process({ params: p, inputs: i, connected, outputs: o }) {
    // A-138a's first input is normalled to a +5V offset reference.
    const sum =
      (connected.in1 ? i.in1 : 5) * p.level1 +
      i.in2 * p.level2 +
      i.in3 * p.level3 +
      i.in4 * p.level4;
    o.out = clamp(sum * p.master, -10, 10);
  },
};
export default processor;
