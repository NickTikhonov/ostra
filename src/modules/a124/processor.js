// @ts-check
import { clamp } from '../../audio/dsp.js';
/** @satisfies {import('../types').ModuleProcessor<{ic1:number;ic2:number}>} */
const processor = {
  createState: () => ({ ic1: 0, ic2: 0 }),
  process({ params: p, inputs: i, outputs: o, state: s, sampleRate: sr }) {
    // Oversampled nonlinear state-variable approximation of the Wasp signal path.
    const cutoff = clamp(p.cutoff * Math.pow(2, i.cv1 + i.cv2 * p.cv2), 15, sr * 0.4);
    const g = Math.tan((Math.PI * cutoff) / (sr * 2)),
      k = 2 - 1.82 * p.resonance,
      a = 1 / (1 + g * (g + k));
    const input = Math.tanh(((i.in * p.level) / 5) * 1.35) * 5;
    let low = 0,
      band = 0,
      high = 0;
    for (let n = 0; n < 2; n++) {
      band = a * (s.ic1 + g * (input - s.ic2));
      low = s.ic2 + g * band;
      s.ic1 = clamp(2 * band - s.ic1, -25, 25);
      s.ic2 = clamp(2 * low - s.ic2, -25, 25);
      high = input - k * band - low;
    }
    o.band = Math.tanh(band / 7) * 7;
    o.mix = clamp(low * (1 - p.mix) + high * p.mix, -12, 12);
    if (!Number.isFinite(o.band + o.mix)) {
      s.ic1 = 0;
      s.ic2 = 0;
      o.band = 0;
      o.mix = 0;
    }
  },
};
export default processor;
