// @ts-check
import { clamp, gentleTimeScale, random, TAU } from '../../audio/dsp.js';
const PARTIALS = 16,
  VOICES = 4;
const BELL = [
  1, 2.01, 2.76, 4.07, 5.43, 6.79, 8.21, 9.53, 11.07, 12.81, 14.67, 16.51, 18.39, 20.31, 22.61,
  25.13,
];
/** @typedef {{sin:Float64Array;cos:Float64Array;rotationSin:Float64Array;rotationCos:Float64Array;amplitude:Float64Array;damping:Float64Array;attack:number;energy:number;noise:number;noiseDecay:number;last:number}} Voice */
/** @typedef {{voices:Voice[];trigger:boolean;manual:boolean;seed:number;attackRate:number;stealRate:number;stolen:number;dcIn:number;dcOut:number;dcPole:number}} State */
/** @param {import('../types').ProcessorContext<State>} c */
function strike(c) {
  const { state: s, inputs: i, params: p, connected, sampleRate: sr } = c;
  let voice = s.voices[0];
  for (let n = 1; n < VOICES; n++) if (s.voices[n].energy < voice.energy) voice = s.voices[n];
  s.stolen += voice.last;
  const velocity = connected.accent ? clamp(i.accent / 5, 0, 1) : 1;
  const frequency = clamp(261.625565 * 2 ** clamp(p.tune / 12 + i.pitch, -8, 7), 20, sr * 0.2);
  const color = clamp(p.color + i.color * 0.1, 0, 1),
    morph = clamp(p.morph + i.morph * 0.1, 0, 1);
  const decay = clamp(p.decay * gentleTimeScale(i.decay), 0.04, 6),
    model = Math.round(p.model);
  let total = 0;
  for (let n = 0; n < PARTIALS; n++) {
    const harmonic = n + 1;
    let ratio = harmonic;
    if (model === 0) ratio *= Math.sqrt(1 + morph * 0.001 * n * n);
    else if (model === 1) ratio = harmonic + (BELL[n] - harmonic) * (0.45 + morph * 0.55);
    else ratio = harmonic + ((2 * n + 3) ** 2 / 9 - harmonic) * (0.6 + morph * 0.4);
    const hz = frequency * ratio,
      band = clamp((sr * 0.45 - hz) / (sr * 0.08), 0, 1);
    let weight = Math.exp(-n * (1.55 - color * 1.42));
    if (model === 0)
      weight *= 0.2 + 0.8 * Math.abs(Math.sin(harmonic * Math.PI * (0.12 + morph * 0.32)));
    else if (model === 1) weight *= n % 2 ? 0.45 + 0.45 * morph : 1;
    else weight *= Math.exp(-n * 0.22);
    if (n === 0) weight = Math.max(weight, 0.55);
    voice.amplitude[n] = weight * band;
    total += weight * band;
    const seconds =
      decay / (1 + n * (model === 1 ? 0.035 : model === 2 ? 0.32 : 0.12) * (1.3 - color));
    voice.damping[n] = Math.exp((-Math.LN10 * 3) / (seconds * sr));
    voice.sin[n] = 0;
    voice.cos[n] = 1;
    voice.rotationSin[n] = Math.sin((TAU * hz) / sr);
    voice.rotationCos[n] = Math.cos((TAU * hz) / sr);
  }
  for (let n = 0; n < PARTIALS; n++) voice.amplitude[n] *= (4.8 * velocity) / Math.max(total, 0.01);
  voice.attack = 0;
  voice.energy = velocity;
  voice.noise = p.strike * velocity * (model === 2 ? 0.55 : 0.16);
  voice.noiseDecay = Math.exp(-1 / (sr * (0.002 + p.strike * 0.008)));
  voice.last = 0;
}
/** @satisfies {import('../types').ModuleProcessor<State>} */
const processor = {
  createState(sr, id) {
    let seed = 1234567;
    for (let n = 0; n < id.length; n++) seed = (Math.imul(seed, 31) + id.charCodeAt(n)) >>> 0;
    return {
      voices: Array.from({ length: VOICES }, () => ({
        sin: new Float64Array(PARTIALS),
        cos: new Float64Array(PARTIALS),
        rotationSin: new Float64Array(PARTIALS),
        rotationCos: new Float64Array(PARTIALS),
        amplitude: new Float64Array(PARTIALS),
        damping: new Float64Array(PARTIALS),
        attack: 0,
        energy: 0,
        noise: 0,
        noiseDecay: 0,
        last: 0,
      })),
      trigger: false,
      manual: false,
      seed,
      attackRate: 1 - Math.exp(-1 / (sr * 0.0008)),
      stealRate: Math.exp(-1 / (sr * 0.002)),
      stolen: 0,
      dcIn: 0,
      dcOut: 0,
      dcPole: Math.exp((-TAU * 12) / sr),
    };
  },
  process(c) {
    const { state: s, inputs: i, outputs: o, params: p } = c;
    const trigger = i.trigger > 1;
    if ((trigger && !s.trigger) || s.manual) strike(c);
    s.trigger = trigger;
    s.manual = false;
    let sum = s.stolen;
    s.stolen *= s.stealRate;
    for (let v = 0; v < VOICES; v++) {
      const voice = s.voices[v];
      if (voice.energy < 1e-6) {
        voice.last = 0;
        continue;
      }
      let signal = 0,
        energy = 0;
      for (let n = 0; n < PARTIALS; n++) {
        const sin = voice.sin[n],
          cos = voice.cos[n];
        voice.sin[n] = sin * voice.rotationCos[n] + cos * voice.rotationSin[n];
        voice.cos[n] = cos * voice.rotationCos[n] - sin * voice.rotationSin[n];
        signal += voice.sin[n] * voice.amplitude[n];
        voice.amplitude[n] *= voice.damping[n];
        energy += voice.amplitude[n];
      }
      voice.attack += (1 - voice.attack) * s.attackRate;
      signal += (random(s) * 2 - 1) * voice.noise;
      voice.noise *= voice.noiseDecay;
      voice.energy = energy + voice.noise;
      voice.last = signal * voice.attack;
      sum += voice.last;
    }
    const blocked = sum - s.dcIn + s.dcPole * s.dcOut;
    s.dcIn = sum;
    s.dcOut = blocked;
    o.out = 5 * Math.tanh(blocked / 5) * p.level;
  },
  onEvent({ state }, event) {
    if (event === 'strike') state.manual = true;
  },
  getDisplayState: (state) => ({ energy: Math.max(...state.voices.map((v) => v.energy)) }),
};
export default processor;
