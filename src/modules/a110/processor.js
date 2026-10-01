// @ts-check
import { clamp, blep } from '../../audio/dsp.js';
/** @satisfies {import('../types').ModuleProcessor<{phase:number;sync:boolean;triangle:number}>} */
const processor = {
  createState: () => ({ phase: 0, sync: false, triangle: -1 }),
  process({ params: p, inputs: i, outputs: o, state: s, sampleRate: sr }) {
    const sync = i.sync > 1;
    if (sync && !s.sync) {
      s.phase = 0;
      s.triangle = -1;
    }
    s.sync = sync;
    const frequency = clamp(
      261.625565 * Math.pow(2, Math.round(p.range) + p.tune / 12 + i.cv1 + i.cv2 * p.cv2),
      0.01,
      sr * 0.4,
    );
    const dt = frequency / sr,
      t = s.phase;
    const width = clamp(p.pw + i.pw1 * 0.1 + i.pw2 * p.pwm * 0.1, 0.02, 0.98);
    const square = (t < 0.5 ? 1 : -1) + blep(t, dt) - blep((t + 0.5) % 1, dt);
    // Integrating the band-limited square avoids a bright digital triangle corner.
    s.triangle = (s.triangle + 4 * dt * square) / (1 + dt * 0.004);
    s.phase = (t + dt) % 1;
    o.saw = (1 - 2 * t + blep(t, dt)) * 4;
    o.pulse = ((t < width ? 1 : -1) + blep(t, dt) - blep((t - width + 1) % 1, dt)) * 4;
    // A saw-derived rounded triangle, rather than a second independent oscillator.
    const triangle = clamp(s.triangle, -1, 1);
    o.triangle = triangle * 5;
    o.sine = (Math.tanh(triangle * 1.6) / Math.tanh(1.6)) * 5;
  },
};
export default processor;
