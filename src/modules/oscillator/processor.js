// @ts-check
import { TAU, clamp, blep } from '../../audio/dsp.js';
/** @satisfies {import('../types').ModuleProcessor<{phase:number;sync:boolean;triangle:number}>} */
const processor = {
  createState: () => ({ phase: 0, sync: false, triangle: -1 }),
  process({ params: p, inputs, outputs, state: s, sampleRate: sr }) {
    const f = clamp(
      261.625565 * Math.pow(2, (p.tune + p.fine / 100) / 12 + inputs.pitch + inputs.fm * p.fm),
      1,
      sr * 0.4,
    );
    const sync = inputs.sync > 1;
    if (sync && !s.sync) {
      s.phase = 0;
      s.triangle = -1;
    }
    s.sync = sync;
    const dt = f / sr,
      t = s.phase,
      width = clamp(p.width + inputs.pwm * 0.1, 0.02, 0.98);
    s.phase = (t + dt) % 1;
    outputs.sine = Math.sin(TAU * t) * 5;
    outputs.saw = (2 * t - 1 - blep(t, dt)) * 5;
    outputs.pulse = ((t < width ? 1 : -1) + blep(t, dt) - blep((t - width + 1) % 1, dt)) * 5;
    const square = (t < 0.5 ? 1 : -1) + blep(t, dt) - blep((t + 0.5) % 1, dt);
    s.triangle = (s.triangle + 4 * dt * square) / (1 + dt * 0.004);
    outputs.triangle = clamp(s.triangle, -1, 1) * 5;
  },
};
export default processor;
