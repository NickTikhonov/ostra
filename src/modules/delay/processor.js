// @ts-check
import { clamp } from '../../audio/dsp.js';
const divisions = [0.25, 0.5, 1, 1.5, 2];
/** @satisfies {import('../types').ModuleProcessor<{buffer:Float32Array;write:number;filter:number;clock:boolean;elapsed:number;period:number;seen:boolean;delay:number}>} */
const processor = {
  createState: (sr) => ({
    buffer: new Float32Array(Math.ceil(sr * 4) + 4),
    write: 0,
    filter: 0,
    clock: false,
    elapsed: 0,
    period: 0.32,
    seen: false,
    delay: sr * 0.32,
  }),
  process({ inputs: i, connected, params: p, outputs: o, state: s, sampleRate: sr }) {
    const clock = i.clock > 1;
    s.elapsed++;
    if (clock && !s.clock) {
      if (s.seen) s.period = clamp(s.elapsed / sr, 0.01, 4);
      s.elapsed = 0;
      s.seen = true;
    }
    s.clock = clock;
    const seconds = clamp(
      (connected.clock ? s.period * divisions[Math.round(p.division)] : p.time) *
        Math.pow(2, clamp(i.time, -4, 4)),
      0.002,
      4,
    );
    s.delay += (seconds * sr - s.delay) * 0.0005;
    const read = (s.write - s.delay + s.buffer.length) % s.buffer.length,
      a = Math.floor(read),
      fraction = read - a;
    const delayed = s.buffer[a] * (1 - fraction) + s.buffer[(a + 1) % s.buffer.length] * fraction;
    const alpha = 1 - Math.exp((-2 * Math.PI * Math.min(p.tone, sr * 0.4)) / sr);
    s.filter += alpha * (delayed - s.filter);
    s.buffer[s.write] = Math.tanh((i.in + s.filter * p.feedback) / 12) * 12;
    s.write = (s.write + 1) % s.buffer.length;
    o.wet = s.filter;
    o.out = i.in * (1 - p.mix) + s.filter * p.mix;
  },
};
export default processor;
