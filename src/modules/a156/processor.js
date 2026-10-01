// @ts-check
import { clamp } from '../../audio/dsp.js';
const major = [0, 2, 4, 5, 7, 9, 11],
  minor = [0, 2, 3, 5, 7, 8, 10];
/** @param {number} note @param {number} scale @param {number} mode @param {number} extension */
function quantize(note, scale, mode, extension) {
  if (scale === 2) return Math.round(note);
  let best = 0,
    distance = Infinity;
  const octave = Math.floor(note / 12),
    third = scale === 1 ? 4 : 3;
  for (let oct = Math.max(0, octave - 1); oct <= Math.min(10, octave + 1); oct++)
    for (let pc = 0; pc < 12; pc++) {
      let allowed =
        mode === 2
          ? (scale === 1 ? major : minor).includes(pc)
          : pc === 0 || pc === 7 || (mode === 1 && pc === third);
      if (mode !== 2 && extension !== 1 && pc === (extension === 0 ? 9 : 10)) allowed = true;
      const candidate = oct * 12 + pc,
        d = Math.abs(note - candidate);
      if (allowed && candidate <= 120 && d < distance) {
        best = candidate;
        distance = d;
      }
    }
  return best;
}
/** @satisfies {import('../types').ModuleProcessor<{scan:number;channels:{lastTrigger:boolean;lastInput:number;lastConfig:number;note:number;pulse:number;gap:number;led:number;out:number}[]}>} */
const processor = {
  createState: () => ({
    scan: 0,
    channels: [1, 2].map(() => ({
      lastTrigger: false,
      lastInput: NaN,
      lastConfig: -1,
      note: NaN,
      pulse: 0,
      gap: 0,
      led: 0,
      out: 0,
    })),
  }),
  process({ params: p, inputs: i, connected, outputs: o, state: s, sampleRate: sr }) {
    const scale = Math.round(p.scale),
      mode = Math.round(p.mode),
      extension = Math.round(p.extension),
      config = scale * 9 + mode * 3 + extension;
    const scan = ++s.scan >= sr / 500;
    if (scan) s.scan = 0;
    for (let n = 1; n <= 2; n++) {
      const ch = s.channels[n - 1],
        trigger = i[`trig${n}`] > 1,
        cv = clamp(i[`cv${n}`], 0, 10);
      const shouldSample = connected[`trig${n}`]
        ? trigger && !ch.lastTrigger
        : (scan || !Number.isFinite(ch.lastInput)) &&
          (cv !== ch.lastInput || (n === 2 && ch.lastConfig !== config));
      if (shouldSample) {
        const note = quantize(cv * 12, n === 1 ? 2 : scale, mode, extension);
        // A transpose-only change does not retrigger quantization.
        const output = clamp((note + Math.round(clamp(i.transpose, 0, 10) * 12)) / 12, 0, 10);
        if (output !== ch.out || !Number.isFinite(ch.note)) {
          if (ch.pulse > 0 && ch.gap === 0) ch.gap = Math.round(sr * 0.005);
          ch.pulse = Math.round(sr * 0.01);
          ch.led = Math.round(sr * 0.08);
        }
        ch.note = note;
        ch.out = output;
        ch.lastInput = cv;
        ch.lastConfig = config;
      }
      if (ch.led > 0) ch.led--;
      ch.lastTrigger = trigger;
      o[`out${n}`] = ch.out;
      o[`trigOut${n}`] = ch.gap === 0 && ch.pulse > 0 ? 5 : 0;
      if (ch.gap > 0) ch.gap--;
      else if (ch.pulse > 0) ch.pulse--;
    }
  },
  getDisplayState: (s) => ({ trigger1: s.channels[0].led > 0, trigger2: s.channels[1].led > 0 }),
};
export default processor;
