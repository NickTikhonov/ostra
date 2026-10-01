// @ts-check
import { clamp } from '../../audio/dsp.js';

/** @satisfies {import('../types').ModuleProcessor<{positive:number[];negative:number[];decay:number}>} */
const processor = {
  createState: (sr) => ({
    positive: [0, 0, 0],
    negative: [0, 0, 0],
    decay: Math.exp(-1 / (sr * 0.08)),
  }),
  process({ inputs: i, connected, params: p, outputs: o, state: s }) {
    // An unplugged socket supplies +5V. A patched zero must remain zero.
    const pair1 = (connected.a1 ? i.a1 : 5) * p.a1 + (connected.b1 ? i.b1 : 5) * p.b1;
    const pair2 = (connected.a2 ? i.a2 : 5) * p.a2 + (connected.b2 ? i.b2 : 5) * p.b2;
    const pair3 = (connected.a3 ? i.a3 : 5) * p.a3 + (connected.b3 ? i.b3 : 5) * p.b3;
    // Explicit links cascade the mix; patching an earlier output never breaks a link.
    // Linear/DC-coupled within ±10V, with hard rails rather than soft saturation.
    o.out1 = clamp(pair1, -10, 10);
    o.out2 = clamp(pair2 + (p.link12 > 0.5 ? o.out1 : 0), -10, 10);
    o.out3 = clamp(pair3 + (p.link23 > 0.5 ? o.out2 : 0), -10, 10);
    for (let n = 0; n < 3; n++) {
      const value = n === 0 ? o.out1 : n === 1 ? o.out2 : o.out3;
      s.positive[n] = Math.max(Math.max(0, value) / 10, s.positive[n] * s.decay);
      s.negative[n] = Math.max(Math.max(0, -value) / 10, s.negative[n] * s.decay);
    }
  },
  getDisplayState: (s) => ({
    positive1: s.positive[0],
    negative1: s.negative[0],
    positive2: s.positive[1],
    negative2: s.negative[1],
    positive3: s.positive[2],
    negative3: s.negative[2],
  }),
};
export default processor;
