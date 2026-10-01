// @ts-check
import { clamp } from '../../audio/dsp.js';
/** @satisfies {import('../types').ModuleProcessor<{tone:number;previous:number;bass:number;envelope:number;dcIn:number;dcOut:number}>} */
const processor = {
  createState: () => ({ tone: 0, previous: 0, bass: 0, envelope: 0, dcIn: 0, dcOut: 0 }),
  process({ inputs: i, params: p, outputs: o, state: s, sampleRate: sr }) {
    const input = clamp(i.in, -40, 40),
      dirt = p.dirt,
      mode = Math.round(p.mode);
    const gain = clamp(Math.pow(p.drive, 1.3) * Math.pow(2, clamp(i.drive, -10, 10) / 5), 1, 512);
    s.bass += (input - s.bass) * (1 - Math.exp((-2 * Math.PI * 160) / sr));
    const edge = input + (input - s.bass) * dirt * 1.5;
    const envelopeRate = Math.abs(input) > s.envelope ? 0.0005 : 0.025;
    s.envelope += (Math.abs(input) - s.envelope) * (1 - Math.exp(-1 / (sr * envelopeRate)));
    // Bias starvation suppresses quiet tails; DIRT=0 leaves the gate fully open.
    const threshold = dirt * dirt * 0.12;
    const gate = dirt === 0 ? 1 : clamp((s.envelope - threshold) / (0.025 + threshold), 0, 1);
    const toneRate = 1 - Math.exp((-2 * Math.PI * Math.min(p.tone, sr * 0.4)) / (sr * 4));
    const bias = dirt * 0.65,
      zero = Math.tanh(bias),
      steps = Math.pow(2, 12 - 8 * dirt);
    let wet = 0;
    // Four substeps smooth the nonlinear stages; crushing follows the shaping.
    for (let n = 1; n <= 4; n++) {
      const x = ((s.previous + ((edge - s.previous) * n) / 4) / 5) * gain;
      let shaped;
      if (mode === 0) {
        const first = Math.tanh(x + bias) - zero;
        shaped = Math.tanh(first * (1 + dirt * 5));
      } else if (mode === 1) {
        const starved = Math.sign(x) * Math.max(0, Math.abs(x) - dirt * 0.3);
        shaped = clamp(starved, -1 + dirt * 0.4, 1);
      } else {
        shaped = (2 / Math.PI) * Math.asin(Math.sin(((x + bias) * Math.PI) / 2));
      }
      const crushed = Math.round(shaped * steps) / steps;
      shaped += (crushed - shaped) * dirt;
      s.tone += (shaped * 5 * gate - s.tone) * toneRate;
      wet += s.tone * 0.25;
    }
    s.previous = edge;
    const blocked = wet - s.dcIn + Math.exp((-2 * Math.PI * 12) / sr) * s.dcOut;
    s.dcIn = wet;
    s.dcOut = blocked;
    o.out = i.in * (1 - p.mix) + blocked * p.mix;
  },
};
export default processor;
