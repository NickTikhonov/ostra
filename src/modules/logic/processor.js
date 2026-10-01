// @ts-check
const createState = () => ({ a: false, b: false, high: false });
/** @satisfies {import('../types').ModuleProcessor<ReturnType<typeof createState>>} */
const processor = {
  createState,
  process({ params: p, inputs: i, outputs: o, state: s }) {
    s.a = i.a > 1;
    s.b = i.b > 1;
    o.and = s.a && s.b ? 5 : 0;
    o.or = s.a || s.b ? 5 : 0;
    o.xor = s.a !== s.b ? 5 : 0;
    o.not = s.a ? 0 : 5;
    const difference = i.signal - (p.threshold + i.threshold),
      band = p.hysteresis / 2;
    if (difference > band) s.high = true;
    else if (difference < -band) s.high = false;
    o.high = s.high ? 5 : 0;
    o.low = s.high ? 0 : 5;
  },
  getDisplayState: (s) => ({ a: s.a, b: s.b, high: s.high }),
};
export default processor;
