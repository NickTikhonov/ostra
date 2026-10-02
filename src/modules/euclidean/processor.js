// @ts-check
import { random } from '../../audio/dsp.js';
import { isHit } from './pattern.js';
import { TRACKS } from './tracks.js';
/** @typedef {{step:number;hit:boolean;rest:boolean;cycle:boolean;seed:number}} TrackState */
/** @satisfies {import('../types').ModuleProcessor<{tracks:TrackState[];phase:number;clock:boolean;reset:boolean;manual:boolean;external:boolean;elapsed:number;pulse:number}>} */
const processor = {
  createState: (_sr, id) => ({
    tracks: TRACKS.map((track) => ({
      step: -1,
      hit: false,
      rest: false,
      cycle: false,
      seed: Array.from(id + track.label).reduce(
        (s, c) => (Math.imul(s, 31) + c.charCodeAt(0)) >>> 0,
        1234567,
      ),
    })),
    phase: 1,
    clock: false,
    reset: false,
    manual: false,
    external: false,
    elapsed: 1e6,
    pulse: 0,
  }),
  process({ inputs: i, connected, params: p, outputs: o, state: s, sampleRate: sr }) {
    const clock = i.clock > 1,
      reset = i.reset > 1,
      external = !!connected.clock;
    if (external !== s.external) {
      s.phase = 0;
      s.pulse = 0;
      s.elapsed = sr;
      s.external = external;
    }
    if ((reset && !s.reset) || s.manual) {
      for (let n = 0; n < 3; n++) s.tracks[n].step = -1;
      s.phase = 1;
      s.pulse = 0;
      s.manual = false;
    }
    const edge = clock && !s.clock;
    s.clock = clock;
    s.reset = reset;
    s.elapsed = Math.min(s.elapsed + 1, sr * 10);
    let tick = external && edge;
    const period = 60 / (p.tempo * 4);
    if (!external) {
      s.phase += 1 / (period * sr);
      if (s.phase >= 1) {
        s.phase %= 1;
        tick = true;
      }
    }
    if (tick) {
      for (let n = 0; n < 3; n++) {
        const keys = TRACKS[n],
          track = s.tracks[n];
        const steps = Math.round(p[keys.steps]),
          hits = Math.min(steps, Math.round(p[keys.hits])),
          rotate = Math.round(p[keys.rotate]) % steps;
        track.step = (track.step + 1) % steps;
        const intended = isHit(track.step, steps, hits, rotate);
        track.hit = intended && random(track) < p[keys.chance];
        // Legacy A outputs retain their original meaning.
        track.rest = !intended;
        track.cycle = track.step === 0;
      }
      s.pulse = Math.max(
        1,
        Math.round(Math.min(sr * 0.01, (external ? s.elapsed : period * sr) * 0.5)),
      );
      s.elapsed = 0;
    }
    for (let n = 0; n < 3; n++) o[TRACKS[n].out] = s.pulse > 0 && s.tracks[n].hit ? 5 : 0;
    o.rest = s.pulse > 0 && s.tracks[0].rest ? 5 : 0;
    o.cycle = s.pulse > 0 && s.tracks[0].cycle ? 5 : 0;
    if (s.pulse > 0) s.pulse--;
  },
  onEvent({ state }, event) {
    if (event === 'reset') state.manual = true;
  },
  getDisplayState: (state) => ({
    step: state.tracks[0].step,
    stepB: state.tracks[1].step,
    stepC: state.tracks[2].step,
    external: state.external,
  }),
};
export default processor;
