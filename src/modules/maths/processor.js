// @ts-check
import { clamp } from '../../audio/dsp.js';
/** @typedef {{value:number;stage:number;phase:number;start:number;peak:number;trigger:boolean;eor:boolean;eoc:boolean}} FunctionState */
/** @returns {FunctionState} */
const channel = () => ({
  value: 0,
  stage: 0,
  phase: 0,
  start: 0,
  peak: 8,
  trigger: false,
  eor: false,
  eoc: true,
});
/** @param {number} position @param {number} curve */
function shape(position, curve) {
  const k = curve * 6;
  return Math.abs(k) < 0.001 ? position : Math.expm1(k * position) / Math.expm1(k);
}
/** @param {FunctionState} s @param {number} peak */
function activate(s, peak) {
  s.stage = 1;
  s.start = s.value;
  s.peak = peak;
  s.phase = 0;
}
/** @satisfies {import('../types').ModuleProcessor<{one:FunctionState;four:FunctionState;sum:number}>} */
const processor = {
  createState: () => ({ one: channel(), four: channel(), sum: 0 }),
  process({
    params: p,
    inputs: i,
    connected,
    outputConnected,
    outputs: o,
    state: s,
    sampleRate: sr,
  }) {
    for (let index = 0; index < 2; index++) {
      const n = index === 0 ? 1 : 4,
        ch = index === 0 ? s.one : s.four;
      const trigger = i[`trig${n}`] > 2.5,
        cycling = p[`cycle${n}`] > 0.5 || i[`cycle${n}`] > 2.5;
      // Rising triggers are ignored during the rise, permitting clock division.
      if (trigger && !ch.trigger && ch.stage !== 1) activate(ch, 10);
      ch.trigger = trigger;
      if (ch.stage === 0 && cycling) activate(ch, 8);
      const speed = Math.pow(2, clamp(i[`both${n}`], -8, 8));
      const curve = p[`curve${n}`];
      const responseTime = Math.pow(2, -curve);
      const rise = clamp(
        (p[`rise${n}`] * Math.max(0.02, 1 + i[`rise${n}`] * 0.25) * responseTime) / speed,
        1 / sr,
        1500,
      );
      const fall = clamp(
        (p[`fall${n}`] * Math.max(0.02, 1 + i[`fall${n}`] * 0.25) * responseTime) / speed,
        1 / sr,
        1500,
      );
      if (ch.stage === 1) {
        ch.eor = false;
        ch.eoc = true;
        ch.phase = Math.min(1, ch.phase + 1 / (rise * sr));
        ch.value = ch.start + (ch.peak - ch.start) * shape(ch.phase, curve);
        if (ch.phase >= 1) {
          ch.stage = 2;
          ch.phase = 0;
          ch.start = ch.value;
          ch.eor = true;
          ch.eoc = false;
        }
      } else if (ch.stage === 2) {
        ch.eor = true;
        ch.eoc = false;
        ch.phase = Math.min(1, ch.phase + 1 / (fall * sr));
        ch.value = ch.start * (1 - shape(ch.phase, -curve));
        if (ch.phase >= 1) {
          ch.stage = 0;
          ch.value = 0;
          ch.eor = false;
          ch.eoc = true;
        }
      } else {
        // Direct signal inputs are independent rise/fall slew limiters (ASR on a gate).
        const target = connected[`in${n}`] ? clamp(i[`in${n}`], -10, 10) : 0;
        const difference = target - ch.value,
          time = difference > 0 ? rise : fall;
        const rate =
          (10 / (time * sr)) * Math.pow(Math.max(0.02, Math.abs(difference) / 10), -curve * 0.85);
        ch.value += Math.sign(difference) * Math.min(Math.abs(difference), rate);
        if (difference > 1e-8) {
          ch.eor = ch.value >= target - 1e-8;
          ch.eoc = true;
        } else if (difference < -1e-8) {
          ch.eor = true;
          ch.eoc = ch.value <= target + 1e-8;
        }
        if (Math.abs(ch.value) < 1e-8 && Math.abs(target) < 1e-8) {
          ch.eor = false;
          ch.eoc = true;
        }
      }
      o[`unity${n}`] = ch.value;
      o[`ch${n}`] = clamp(ch.value * p[`att${n}`], -10, 10);
    }
    o.ch2 = clamp((connected.in2 ? i.in2 : 10) * p.att2, -10, 10);
    o.ch3 = clamp((connected.in3 ? i.in3 : 5) * p.att3, -10, 10);
    o.eor = s.one.eor ? 10 : 0;
    o.eoc = s.four.eoc ? 10 : 0;
    let sum = 0,
      or = 0;
    for (let n = 1; n <= 4; n++)
      if (!outputConnected[`ch${n}`]) {
        sum += o[`ch${n}`];
        or = Math.max(or, o[`ch${n}`]);
      }
    o.sum = clamp(sum, -10, 10);
    o.inv = -o.sum;
    o.or = or;
    s.sum = o.sum;
  },
  getDisplayState: (s) => ({ ch1: s.one.value, ch4: s.four.value, sum: s.sum }),
};
export default processor;
