// @ts-check
import { clamp, TAU } from '../../audio/dsp.js';
/** Stable antiderivative of tanh; avoids overflow at high drive.
 * @param {number} x */
function logCosh(x) {
  const magnitude = Math.abs(x);
  return magnitude + Math.log1p(Math.exp(-2 * magnitude)) - Math.LN2;
}
const PORTS = ['left', 'right'];
/** @satisfies {import('../types').ModuleProcessor<{channels:{previous:number;bass:number;tone:number;dcIn:number;dcOut:number}[];dcPole:number;bassRate:number;meter:number;meterAttack:number;meterRelease:number}>} */
const processor = {
  createState: (sr) => ({
    channels: Array.from({ length: 2 }, () => ({
      previous: 0,
      bass: 0,
      tone: 0,
      dcIn: 0,
      dcOut: 0,
    })),
    dcPole: Math.exp((-TAU * 10) / sr),
    bassRate: 1 - Math.exp((-TAU * 450) / sr),
    meter: 0,
    meterAttack: 1 - Math.exp(-1 / (sr * 0.06)),
    meterRelease: 1 - Math.exp(-1 / (sr * 0.3)),
  }),
  process({ inputs: i, connected, params: p, outputs: o, state: s, sampleRate: sr }) {
    const drive = p.drive * 10 ** p.scorch,
      heat = clamp((drive - 1.5) / 6, 0, 1),
      bias = p.warmth * (0.3 + heat * 0.35),
      zero = Math.tanh(bias);
    // Keep the gentle end level-matched, but stop attenuating the wet signal
    // once it is driven hard. Otherwise the dry mix buries all the new harmonics.
    const compensation = Math.min(drive, 2);
    const toneRate = 1 - Math.exp((-TAU * Math.min(16000 * 2 ** (-2 * p.warmth), sr * 0.4)) / sr);
    let power = 0;
    for (let c = 0; c < 2; c++) {
      const state = s.channels[c],
        port = PORTS[c];
      const dry = c === 1 && !connected.right ? i.left : i[port];
      const input = clamp(dry, -40, 40);
      state.bass += (input - state.bass) * s.bassRate;
      const coloured = input + state.bass * p.warmth * heat * 0.6;
      power = Math.max(power, (coloured * drive) ** 2);
      const now = (coloured * drive) / 7 + bias,
        previous = (state.previous * drive) / 7 + bias;
      const difference = now - previous;
      // First-order antiderivative antialiasing averages the soft knee between samples.
      const shaped =
        Math.abs(difference) > 1e-5
          ? (logCosh(now) - logCosh(previous)) / difference
          : Math.tanh((now + previous) * 0.5);
      const wet = ((shaped - zero) * 7) / compensation;
      state.previous = coloured;
      state.tone += (wet - state.tone) * toneRate;
      const blocked = state.tone - state.dcIn + s.dcPole * state.dcOut;
      state.dcIn = state.tone;
      state.dcOut = blocked;
      o[port] = (dry * (1 - p.mix) + blocked * p.mix) * p.level;
    }
    s.meter += (power - s.meter) * (power > s.meter ? s.meterAttack : s.meterRelease);
  },
  getDisplayState: (state) => ({ driveDb: 10 * Math.log10(Math.max(state.meter, 1e-12) / 12.5) }),
};
export default processor;
