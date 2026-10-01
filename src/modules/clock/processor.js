// @ts-check
const rates = [1, 2, 4, 8];
/** @satisfies {import('../types').ModuleProcessor<{phase:number;tick:number;reset:boolean;resetPulse:number;manual:boolean;wasRunning:boolean}>} */
const processor = {
  createState: () => ({
    phase: 0,
    tick: 0,
    reset: false,
    resetPulse: 0,
    manual: false,
    wasRunning: true,
  }),
  onEvent({ state: s }, event) {
    if (event === 'reset') s.manual = true;
  },
  process({ inputs: i, connected, params: p, outputs: o, state: s, sampleRate: sr }) {
    const reset = i.reset > 1,
      running = !connected.run || i.run > 1;
    const restart = (reset && !s.reset) || s.manual || (running && !s.wasRunning);
    if (restart) {
      s.phase = 0;
      s.tick = 0;
      s.resetPulse = Math.round(sr * 0.01);
      s.manual = false;
    }
    s.reset = reset;
    s.wasRunning = running;
    const base = 60 / (p.bpm * rates[Math.round(p.rate)]),
      length = base * (s.tick % 2 ? 1 - p.swing : 1 + p.swing);
    o.clock = running && s.resetPulse === 0 && s.phase < Math.min(length * 0.5, 0.02) ? 5 : 0;
    o.reset = s.resetPulse > 0 ? 5 : 0;
    if (s.resetPulse > 0) s.resetPulse--;
    if (running) {
      s.phase += 1 / sr;
      if (s.phase >= length) {
        s.phase -= length;
        s.tick = (s.tick + 1) % 2;
      }
    }
  },
};
export default processor;
