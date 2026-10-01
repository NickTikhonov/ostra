// @ts-check
import { clamp, random } from '../../audio/dsp.js';
/** @param {number} _sr @param {string} id */
const createState = (_sr, id) => ({
  seed: Array.from(id).reduce((a, c) => Math.imul(a, 31) + c.charCodeAt(0), 17) >>> 0,
  phase: 1,
  clock: false,
  step: 0,
  smooth: 0,
  pulse: 0,
  sample: false,
  coefficient: 0,
  slew: -1,
});
/** @satisfies {import('../types').ModuleProcessor<ReturnType<typeof createState>>} */
const processor = {
  createState,
  onEvent({ state: s }, event) {
    if (event === 'sample') s.sample = true;
  },
  process({ params: p, inputs: i, connected: c, outputs: o, state: s, sampleRate: sr }) {
    const noise = random(s) * 2 - 1,
      clock = i.clock > 1;
    s.phase += p.rate / sr;
    const tick = c.clock ? clock && !s.clock : s.phase >= 1;
    s.phase %= 1;
    s.clock = clock;
    if ((tick || s.sample) && i.hold <= 1) {
      s.step = c.sample
        ? clamp(i.sample, -10, 10)
        : (p.polarity > 0.5 ? noise : (noise + 1) / 2) * p.range;
      if (random(s) < p.chance) s.pulse = Math.round(sr * 0.01);
    }
    s.sample = false;
    if (p.slew !== s.slew) {
      s.slew = p.slew;
      s.coefficient = 1 - Math.exp(-1 / (sr * p.slew));
    }
    s.smooth += (s.step - s.smooth) * s.coefficient;
    o.step = s.step;
    o.smooth = s.smooth;
    o.noise = noise * 5;
    o.gate = s.pulse > 0 ? 5 : 0;
    if (s.pulse > 0) s.pulse--;
  },
  getDisplayState: (s) => ({ step: s.step, gate: s.pulse > 0 }),
};
export default processor;
