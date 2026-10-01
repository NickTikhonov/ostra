// @ts-check
import { clamp } from '../../audio/dsp.js';
const createState = () => ({
  values: new Float64Array(5),
  clock: false,
  reset: false,
  step: false,
  clear: false,
});
/** @satisfies {import('../types').ModuleProcessor<ReturnType<typeof createState>>} */
const processor = {
  createState,
  onEvent({ state: s }, event) {
    if (event === 'step') s.step = true;
    if (event === 'clear') s.clear = true;
  },
  process({ params: p, inputs: i, outputs: o, state: s }) {
    const clock = i.clock > 1,
      reset = i.reset > 1;
    if ((reset && !s.reset) || s.clear) s.values.fill(0);
    else if (((clock && !s.clock) || s.step) && i.hold <= 1) {
      for (let n = 4; n > 0; n--) s.values[n] = s.values[n - 1];
      s.values[0] = clamp(i.in, -10, 10);
    }
    s.clock = clock;
    s.reset = reset;
    s.step = false;
    s.clear = false;
    o.now = s.values[0];
    for (let n = 1; n <= 4; n++) o['tap' + n] = s.values[n];
    o.out = s.values[Math.round(p.tap)];
  },
  getDisplayState: (s) => ({
    now: s.values[0],
    tap1: s.values[1],
    tap2: s.values[2],
    tap3: s.values[3],
    tap4: s.values[4],
  }),
};
export default processor;
