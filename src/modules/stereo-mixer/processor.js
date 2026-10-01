// @ts-check
import { clamp } from '../../audio/dsp.js';
const createState = () => ({ left: 0, right: 0 });
/** @satisfies {import('../types').ModuleProcessor<ReturnType<typeof createState>>} */
const processor = {
  createState,
  process({ params: p, inputs: i, connected: c, outputs: o, state: s }) {
    let l = 0,
      r = 0,
      sl = 0,
      sr = 0;
    for (let n = 1; n <= 3; n++) {
      const stereo = c['right' + n],
        pan = p['pan' + n],
        angle = ((pan + 1) * Math.PI) / 4;
      const lg = stereo ? Math.min(1, Math.cos(angle) * Math.SQRT2) : Math.cos(angle);
      const rg = stereo ? Math.min(1, Math.sin(angle) * Math.SQRT2) : Math.sin(angle);
      const left = i['left' + n] * p['level' + n] * lg,
        right = (stereo ? i['right' + n] : i['left' + n]) * p['level' + n] * rg;
      l += left;
      r += right;
      sl += left * p['send' + n];
      sr += right * p['send' + n];
    }
    // Return is never sent back to the send bus; master affects the main pair only.
    l += i.returnL * p.return;
    r += (c.returnR ? i.returnR : i.returnL) * p.return;
    o.left = clamp(l * p.master, -20, 20);
    o.right = clamp(r * p.master, -20, 20);
    o.sendL = clamp(sl, -20, 20);
    o.sendR = clamp(sr, -20, 20);
    s.left = Math.max(Math.abs(o.left), s.left * 0.9998);
    s.right = Math.max(Math.abs(o.right), s.right * 0.9998);
  },
  getDisplayState: (s) => ({ left: s.left, right: s.right }),
};
export default processor;
