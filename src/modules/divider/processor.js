// @ts-check
const divisions = [2, 3, 4, 8];
/** @satisfies {import('../types').ModuleProcessor<{count:number;clock:boolean;reset:boolean;pulses:number[]}>} */
const processor = {
  createState: () => ({ count: -1, clock: false, reset: false, pulses: [0, 0, 0, 0] }),
  process({ inputs: i, params: p, outputs: o, state: s, sampleRate: sr }) {
    const clock = i.clock > 1,
      reset = i.reset > 1;
    if (reset && !s.reset) {
      s.count = -1;
      s.pulses.fill(0);
    }
    s.reset = reset;
    const edge = clock && !s.clock && !reset;
    s.clock = clock;
    if (edge) s.count = (s.count + 1) % 24;
    for (let n = 0; n < 4; n++) {
      const division = divisions[n],
        position = (s.count + Math.round(p.offset)) % division;
      if (edge && position === 0) s.pulses[n] = Math.round(sr * 0.008);
      o[`div${division}`] =
        s.count < 0
          ? 0
          : p.mode > 0.5
            ? position < Math.ceil(division / 2)
              ? 5
              : 0
            : s.pulses[n] > 0
              ? 5
              : 0;
      if (s.pulses[n] > 0) s.pulses[n]--;
    }
  },
};
export default processor;
