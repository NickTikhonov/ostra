// @ts-check
import { clamp } from '../../audio/dsp.js';
/** @satisfies {import('../types').ModuleProcessor<Record<string,never>>} */
const processor = {
  createState: () => ({}),
  process({ params: p, inputs: i, outputs: o }) {
    for (let n = 1; n <= 2; n++) {
      const control = clamp(p[`gain${n}`] + (i[`cv${n}`] / 5) * p[`cv${n}`], 0, 1);
      const gain = p[`curve${n}`] > 0.5 ? Math.expm1(control * 5) / Math.expm1(5) : control;
      o[`out${n}`] = clamp(i[`in${n}`] * gain, -10, 10);
    }
  },
};
export default processor;
