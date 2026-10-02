// @ts-check
import { clamp, TAU } from '../../audio/dsp.js';
/** Stable antiderivative of tanh; avoids overflow at high drive.
 * @param {number} x */
function logCosh(x) {
  const magnitude = Math.abs(x);
  return magnitude + Math.log1p(Math.exp(-2 * magnitude)) - Math.LN2;
}
const PORTS = ['left', 'right'];
/** @satisfies {import('../types').ModuleProcessor<{channels:{previous:number;tone:number;dcIn:number;dcOut:number}[];dcPole:number}>} */
const processor = {
  createState: (sr) => ({
    channels: Array.from({ length: 2 }, () => ({ previous: 0, tone: 0, dcIn: 0, dcOut: 0 })),
    dcPole: Math.exp((-TAU * 10) / sr),
  }),
  process({ inputs: i, connected, params: p, outputs: o, state: s, sampleRate: sr }) {
    const drive = p.drive,
      bias = p.warmth * 0.3,
      zero = Math.tanh(bias);
    const toneRate = 1 - Math.exp((-TAU * Math.min(16000 * 2 ** (-2 * p.warmth), sr * 0.4)) / sr);
    for (let c = 0; c < 2; c++) {
      const state = s.channels[c],
        port = PORTS[c];
      const dry = c === 1 && !connected.right ? i.left : i[port];
      const input = clamp(dry, -40, 40);
      const now = (input * drive) / 7 + bias,
        previous = (state.previous * drive) / 7 + bias;
      const difference = now - previous;
      // First-order antiderivative antialiasing averages the soft knee between samples.
      const shaped =
        Math.abs(difference) > 1e-5
          ? (logCosh(now) - logCosh(previous)) / difference
          : Math.tanh((now + previous) * 0.5);
      // Compensate the pre-drive gain: saturation compresses peaks instead of boosting level.
      const wet = ((shaped - zero) * 7) / drive;
      state.previous = input;
      state.tone += (wet - state.tone) * toneRate;
      const blocked = state.tone - state.dcIn + s.dcPole * state.dcOut;
      state.dcIn = state.tone;
      state.dcOut = blocked;
      o[port] = (dry * (1 - p.mix) + blocked * p.mix) * p.level;
    }
  },
};
export default processor;
