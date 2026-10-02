// @ts-check
import { clamp, gentleTimeScale } from '../../audio/dsp.js';
/** @satisfies {import('../types').ModuleProcessor<{value:number;stage:number;gate:boolean;trigger:boolean;end:number}>} */
const processor = {
  createState: () => ({ value: 0, stage: 0, gate: false, trigger: false, end: 0 }),
  process({ inputs: i, params: p, outputs: o, state: s, sampleRate: sr }) {
    // Time CV: ±5V offsets the knob time by at most ±10%. Sustain: +5V adds 100%.
    const attack = clamp(p.attack * gentleTimeScale(i.attack ?? 0), 0.001, 8);
    const decay = clamp(p.decay * gentleTimeScale(i.decay ?? 0), 0.003, 10);
    const sustain = clamp(p.sustain + (i.sustain ?? 0) / 5, 0, 1);
    const release = clamp(p.release * gentleTimeScale(i.release ?? 0), 0.003, 15);
    const gate = i.gate > 1,
      trigger = i.retrigger > 1;
    if ((gate && !s.gate) || (trigger && !s.trigger)) s.stage = 1;
    if (!gate && s.gate) s.stage = 4;
    s.gate = gate;
    s.trigger = trigger;
    if (s.stage === 1) {
      s.value = Math.min(1, s.value + 1 / (attack * sr));
      if (s.value >= 1) s.stage = 2;
    } else if (s.stage === 2) {
      s.value = Math.max(sustain, s.value - (1 - sustain) / (decay * sr));
      if (s.value <= sustain + 0.000001) s.stage = gate ? 3 : 4;
    } else if (s.stage === 3) {
      s.value = sustain;
      if (!gate) s.stage = 4;
    } else if (s.stage === 4) {
      s.value = Math.max(0, s.value - 1 / (release * sr));
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
