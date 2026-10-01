// @ts-check
/** @satisfies {import('../types').ModuleProcessor<{value:number;stage:number;gate:boolean;trigger:boolean;end:number}>} */
const processor = {
  createState: () => ({ value: 0, stage: 0, gate: false, trigger: false, end: 0 }),
  process({ inputs: i, params: p, outputs: o, state: s, sampleRate: sr }) {
    const gate = i.gate > 1,
      trigger = i.retrigger > 1;
    if ((gate && !s.gate) || (trigger && !s.trigger)) s.stage = 1;
    if (!gate && s.gate) s.stage = 4;
    s.gate = gate;
    s.trigger = trigger;
    if (s.stage === 1) {
      s.value = Math.min(1, s.value + 1 / (p.attack * sr));
      if (s.value >= 1) s.stage = 2;
    } else if (s.stage === 2) {
      s.value = Math.max(p.sustain, s.value - (1 - p.sustain) / (p.decay * sr));
      if (s.value <= p.sustain + 0.000001) s.stage = gate ? 3 : 4;
    } else if (s.stage === 3) {
      s.value = p.sustain;
      if (!gate) s.stage = 4;
    } else if (s.stage === 4) {
      s.value = Math.max(0, s.value - 1 / (p.release * sr));
      if (s.value === 0) {
        s.stage = 0;
        s.end = Math.round(sr * 0.01);
      }
    }
    o.env = s.value * 5;
    o.inv = -o.env;
    o.end = s.end > 0 ? 5 : 0;
    if (s.end > 0) s.end--;
  },
};
export default processor;
