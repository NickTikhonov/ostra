// @ts-check
import { clamp } from '../../audio/dsp.js';
const createState = () => ({ selected: 0, clock: false, reset: false, knob: -1, step: false });
/** @satisfies {import('../types').ModuleProcessor<ReturnType<typeof createState>>} */
const processor = {
  createState,
  onEvent({ state: s }, event) {
    if (event === 'step') s.step = true;
  },
  process({ params: p, inputs: i, connected: c, outputs: o, state: s }) {
    const length = Math.round(p.length),
      clock = i.clock > 1,
      reset = i.reset > 1,
      edge = (clock && !s.clock) || s.step;
    const knob = Math.round(p.select) - 1;
    if (knob !== s.knob) {
      s.selected = knob;
      s.knob = knob;
    }
    if (reset && !s.reset) s.selected = 0;
    else if (c.address && (p.mode < 0.5 || edge))
      s.selected = Math.min(length - 1, Math.floor((clamp(i.address, 0, 5) / 5) * length));
    else if (edge && !c.address) s.selected = (s.selected + 1) % length;
    s.selected = Math.min(s.selected, length - 1);
    s.clock = clock;
    s.reset = reset;
    s.step = false;
    o.out = i['in' + (s.selected + 1)];
    for (let n = 1; n <= 4; n++) o['out' + n] = s.selected === n - 1 ? i.signal : 0;
  },
  getDisplayState: (s) => ({ selected: s.selected }),
};
export default processor;
