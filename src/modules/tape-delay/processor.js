// @ts-check
import { clamp, gentleTimeScale, random, TAU } from '../../audio/dsp.js';

/** @typedef {{buffer:Float32Array;write:number;delay:number;tone1:number;tone2:number;
 * dcIn:number;dcOut:number;clock:boolean;elapsed:number;period:number;seen:boolean;
 * wowPhase:number;flutterPhase:number;wander:number;wanderTarget:number;
 * dropout:number;dropoutTarget:number;wearTimer:number;seed:number;
 * speedRate:number;wanderRate:number;dropoutRate:number;dcPole:number}} TapeState */

/** @satisfies {import('../types').ModuleProcessor<TapeState>} */
const processor = {
  createState(sr, id) {
    let seed = 2166136261;
    for (let n = 0; n < id.length; n++) seed = Math.imul(seed ^ id.charCodeAt(n), 16777619) >>> 0;
    return {
      buffer: new Float32Array(Math.ceil(sr * 4) + 8),
      write: 0,
      delay: sr * 0.38,
      tone1: 0,
      tone2: 0,
      dcIn: 0,
      dcOut: 0,
      clock: false,
      elapsed: 0,
      period: 0.38,
      seen: false,
      wowPhase: 0,
      flutterPhase: 0,
      wander: 0,
      wanderTarget: 0,
      dropout: 1,
      dropoutTarget: 1,
      wearTimer: 0,
      seed,
      speedRate: 1 - Math.exp(-1 / (sr * 0.12)),
      wanderRate: 1 - Math.exp(-1 / (sr * 0.2)),
      dropoutRate: 1 - Math.exp(-1 / (sr * 0.012)),
      dcPole: Math.exp((-TAU * 35) / sr),
    };
  },
  process({ inputs: i, connected, params: p, outputs: o, state: s, sampleRate: sr }) {
    const clock = i.clock > 1;
    s.elapsed = Math.min(s.elapsed + 1, sr * 8);
    if (clock && !s.clock) {
      if (s.seen) s.period = clamp(s.elapsed / sr, 0.015, 4);
      s.elapsed = 0;
      s.seen = true;
    }
    s.clock = clock;
    const seconds = clamp(
      (connected.clock && s.seen ? s.period : p.time) * gentleTimeScale(i.time),
      0.015,
      4,
    );
    // A moving read head changes pitch as tape speed settles, rather than crossfading taps.
    s.delay += (seconds * sr - s.delay) * s.speedRate;
    if (--s.wearTimer <= 0) {
      s.wearTimer = Math.round(sr * 0.11);
      s.wanderTarget = random(s) * 2 - 1;
      s.dropoutTarget = random(s) < p.age * 0.07 ? 1 - p.age * (0.3 + 0.7 * random(s)) : 1;
    }
    s.wander += (s.wanderTarget - s.wander) * s.wanderRate;
    s.dropout += (s.dropoutTarget - s.dropout) * s.dropoutRate;
    s.wowPhase = (s.wowPhase + 0.43 / sr) % 1;
    s.flutterPhase = (s.flutterPhase + 6.7 / sr) % 1;
    const wobble =
      p.wow *
      p.wow *
      (Math.sin(s.wowPhase * TAU) * (0.0015 + 0.004 * p.age) +
        Math.sin(s.flutterPhase * TAU) * 0.00035 +
        s.wander * 0.002);
    const delay = clamp(s.delay + wobble * sr, 2, s.buffer.length - 3);
    const read = (s.write - delay + s.buffer.length) % s.buffer.length;
    const a = Math.floor(read),
      fraction = read - a;
    const playback = s.buffer[a] * (1 - fraction) + s.buffer[(a + 1) % s.buffer.length] * fraction;

    // Two lowpass stages and bass roll-off sit inside the feedback loop: every pass wears down.
    const cutoff = Math.min(p.tone * Math.pow(0.3, p.age), sr * 0.2);
    const toneRate = 1 - Math.exp((-TAU * cutoff) / sr);
    s.tone1 += (playback - s.tone1) * toneRate;
    s.tone2 += (s.tone1 - s.tone2) * toneRate;
    const highpass = s.tone2 - s.dcIn + s.dcPole * s.dcOut;
    s.dcIn = s.tone2;
    s.dcOut = highpass;
    const wet = highpass * s.dropout;
    const regeneration = clamp(p.feedback + i.feedback * 0.1, 0, 1.15);
    const hiss = (random(s) * 2 - 1) * p.hiss * p.hiss * 0.12;
    const record = clamp(i.in, -40, 40) * p.drive + wet * regeneration + hiss;
    const bias = p.age * 0.18;
    // Unity small-signal loop gain, bounded magnetic saturation, and age-dependent asymmetry.
    s.buffer[s.write] = 7 * (Math.tanh(record / 7 + bias) - Math.tanh(bias));
    s.write = (s.write + 1) % s.buffer.length;
    o.wet = wet;
    o.out = i.in * (1 - p.mix) + wet * p.mix;
  },
};
export default processor;
