// @ts-check
import { clamp } from '../../audio/dsp.js';
/** @satisfies {import('../types').ModuleProcessor<{stage:number;env:number;eoc:number;lastTrigger:boolean}>} */
const processor = {
  createState: () => ({ stage: 0, env: 0, eoc: 0, lastTrigger: false }),
  process({ params: p, inputs, outputs, state: s, sampleRate: sr }) {
    const trigger = inputs.trigger > 1;
    if (trigger && !s.lastTrigger) s.stage = 1;
    s.lastTrigger = trigger;
    if (s.stage === 0 && p.cycle >= 0.5) s.stage = 1;
    const speed = Math.pow(2, clamp(inputs.time, -5, 5));
    if (s.stage === 1) {
      s.env = Math.min(1, s.env + speed / (p.rise * sr));
      if (s.env >= 1) s.stage = 2;
    } else if (s.stage === 2) {
      s.env = Math.max(0, s.env - speed / (p.fall * sr));
      if (s.env <= 0) {
        s.stage = 0;
        s.eoc = Math.round(sr * 0.005);
      }
    }
    outputs.out = s.env * 5;
    outputs.eoc = s.eoc > 0 ? 5 : 0;
    if (s.eoc > 0) s.eoc--;
  },
};
export default processor;
