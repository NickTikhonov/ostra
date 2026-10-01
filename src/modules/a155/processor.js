// @ts-check
/** @typedef {{step:number;running:boolean;clock:boolean;start:boolean;stop:boolean;manualSteps:number;manualPulse:number;manualReset:boolean;held1:number;held2:number;post1:number;post2:number;sh1:boolean;sh2:boolean;tracks:boolean[]}} SequenceState */
/** @satisfies {import('../types').ModuleProcessor<SequenceState>} */
const processor = {
  createState: () => ({
    step: 0,
    running: true,
    clock: false,
    start: false,
    stop: false,
    manualSteps: 0,
    manualPulse: 0,
    manualReset: false,
    held1: 0,
    held2: 0,
    post1: 0,
    post2: 0,
    sh1: false,
    sh2: false,
    tracks: [false, false, false, false],
  }),
  onEvent({ state: s, sampleRate: sr }, event) {
    if (event === 'start') s.running = true;
    if (event === 'stop') s.running = false;
    if (event === 'reset') s.manualReset = true;
    if (event === 'clock') {
      s.manualSteps++;
      s.manualPulse = Math.round(sr * 0.01);
    }
  },
  process({ params: p, inputs: i, connected, outputs: o, state: s, sampleRate: sr }) {
    const clock = i.clock > 1,
      start = i.start > 1,
      stop = i.stop > 1;
    if (start && !s.start) s.running = true;
    if (stop && !s.stop) s.running = false;
    s.start = start;
    s.stop = stop;
    const reset = i.reset > 1 || s.manualReset;
    if (reset) s.step = 0;
    else if (s.manualSteps > 0) s.step = (s.step + s.manualSteps) % 8;
    else if (s.running && clock && !s.clock) s.step = (s.step + 1) % 8;
    s.manualReset = false;
    s.manualSteps = 0;
    s.clock = clock;
    const manual = s.manualPulse > 0,
      enabled = s.running || manual,
      gateClock = (s.running && clock) || manual;
    if (s.manualPulse > 0) s.manualPulse--;
    const n = s.step + 1,
      top = Math.round(p[`top${n}`]),
      bottom = Math.round(p[`bottom${n}`]);
    o.trig1 = enabled && top === 0 && gateClock ? 5 : 0;
    o.trig2 = enabled && top === 2 && gateClock ? 5 : 0;
    o.trig3 = enabled && bottom === 0 && gateClock ? 5 : 0;
    // Adjacent gate steps stay high throughout the full step, independent of clock width.
    o.gate = enabled && bottom === 2 ? 5 : 0;
    s.tracks[0] = o.trig1 > 0;
    s.tracks[1] = o.trig2 > 0;
    s.tracks[2] = o.trig3 > 0;
    s.tracks[3] = o.gate > 0;
    o.pre1 = p[`a${n}`] * (Math.round(p.range) === 0 ? 1 : Math.round(p.range) === 1 ? 2 : 4);
    o.pre2 = p[`b${n}`] * (connected[`ext${n}`] ? (i[`ext${n}`] * p.scale) / 6.5 : p.scale);
    const sh1 = i.sh1 > 1,
      sh2 = i.sh2 > 1;
    if (!connected.sh1 || !sh1) s.held1 = o.pre1;
    if (!connected.sh2 || !sh2) s.held2 = o.pre2;
    s.sh1 = sh1;
    s.sh2 = sh2;
    const glide1 = !connected.glide1 || i.glide1 <= 1 ? p.glide1 : 0;
    const glide2 = !connected.glide2 || i.glide2 <= 1 ? p.glide2 : 0;
    s.post1 =
      glide1 < 0.00001
        ? s.held1
        : s.post1 + (s.held1 - s.post1) * (1 - Math.exp(-1 / (sr * glide1)));
    s.post2 =
      glide2 < 0.00001
        ? s.held2
        : s.post2 + (s.held2 - s.post2) * (1 - Math.exp(-1 / (sr * glide2)));
    o.post1 = s.post1;
    o.post2 = s.post2;
  },
  getDisplayState: (s) => ({
    step: s.step,
    run: s.running,
    track1: s.tracks[0],
    track2: s.tracks[1],
    track3: s.tracks[2],
    track4: s.tracks[3],
  }),
};
export default processor;
