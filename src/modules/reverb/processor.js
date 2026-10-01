// @ts-check
import { clamp } from '../../audio/dsp.js';
const BASE = [1493, 1601, 1747, 1867, 1999, 2131, 2281, 2477];
const LEFT = [1, 1, 1, 1, -1, -1, -1, -1],
  RIGHT = [1, -1, 1, -1, 1, -1, 1, -1];
const OUT_LEFT = [1, 1, -1, -1, 1, 1, -1, -1],
  OUT_RIGHT = [1, -1, -1, 1, 1, -1, -1, 1];
const NORM = 1 / Math.sqrt(8);
/** @typedef {{buffer:Float32Array,write:number,base:number,delay:number,target:number,gain:number,low:number}} Line */
/** @typedef {{buffer:Float32Array,write:number}} Diffuser */
/** @typedef {{lines:Line[],diffusers:Diffuser[],preL:Float32Array,preR:Float32Array,preWrite:number,preDelay:number,preTarget:number,
 * values:Float64Array,freeze:number,frozen:boolean,coefficientTick:number,ready:boolean,tone:number,mix:number,mixTarget:number,
 * width:number,widthTarget:number,slew:number,dcPole:number,dcInL:number,dcInR:number,dcOutL:number,dcOutR:number}} ReverbState */
/** @param {Float32Array} buffer @param {number} write @param {number} delay */
function read(buffer, write, delay) {
  let at = write - delay;
  if (at < 0) at += buffer.length;
  const a = Math.floor(at),
    fraction = at - a;
  return buffer[a] + (buffer[(a + 1) % buffer.length] - buffer[a]) * fraction;
}
/** @param {Diffuser} d @param {number} input */
function diffuse(d, input) {
  const delayed = d.buffer[d.write],
    output = delayed - input * 0.65;
  d.buffer[d.write] = input + output * 0.65;
  d.write = (d.write + 1) % d.buffer.length;
  return output;
}
/** @satisfies {import('../types').ModuleProcessor<ReverbState>} */
const processor = {
  createState(sr) {
    return {
      lines: BASE.map((length) => {
        const base = (length * sr) / 48000;
        return {
          buffer: new Float32Array(Math.ceil(base * 1.65) + 4),
          write: 0,
          base,
          delay: Math.round(base * 1.1),
          target: Math.round(base * 1.1),
          gain: 0,
          low: 0,
        };
      }),
      diffusers: [0.0047, 0.0091, 0.0053, 0.0117].map((seconds) => ({
        buffer: new Float32Array(Math.max(1, Math.round(seconds * sr))),
        write: 0,
      })),
      preL: new Float32Array(Math.ceil(sr * 0.2) + 4),
      preR: new Float32Array(Math.ceil(sr * 0.2) + 4),
      preWrite: 0,
      preDelay: 0,
      preTarget: 0,
      values: new Float64Array(8),
      freeze: 0,
      frozen: false,
      coefficientTick: 0,
      ready: false,
      tone: 0,
      mix: 0,
      mixTarget: 0,
      width: 0,
      widthTarget: 0,
      slew: 1 - Math.exp(-1 / (sr * 0.025)),
      dcPole: Math.exp((-2 * Math.PI * 20) / sr),
      dcInL: 0,
      dcInR: 0,
      dcOutL: 0,
      dcOutR: 0,
    };
  },
  process({ inputs: i, connected, params: p, outputs: o, state: s, sampleRate: sr }) {
    const left = clamp(i.left, -40, 40),
      right = connected.right ? clamp(i.right, -40, 40) : left;
    const freeze = p.freeze > 0.5 || i.freeze > 1;
    s.freeze += (Number(freeze) - s.freeze) * s.slew;
    if (Math.abs(Number(freeze) - s.freeze) < 1e-5) s.freeze = Number(freeze);
    s.frozen = freeze;
    if (s.coefficientTick-- <= 0) {
      s.coefficientTick = 31;
      const decay = clamp(p.decay * Math.pow(2, clamp(i.decay, -10, 10) / 5), 0.15, 40);
      const size = 0.6 + clamp(p.size, 0, 1);
      s.tone = 1 - Math.exp((-2 * Math.PI * Math.min(p.tone, sr * 0.4)) / sr);
      s.preTarget = clamp(p.predelay, 0, 0.2) * sr;
      s.mixTarget = clamp(p.mix + i.mix / 10, 0, 1);
      s.widthTarget = clamp(p.width, 0, 1);
      for (const line of s.lines) {
        if (!freeze) line.target = Math.round(line.base * size);
        line.gain = Math.pow(0.001, line.delay / (sr * decay));
      }
      if (!s.ready) {
        s.preDelay = s.preTarget;
        s.mix = s.mixTarget;
        s.width = s.widthTarget;
        for (const line of s.lines) {
          line.delay = line.target;
          line.gain = Math.pow(0.001, line.delay / (sr * decay));
        }
        s.ready = true;
      }
    }
    s.preDelay += (s.preTarget - s.preDelay) * s.slew;
    s.mix += (s.mixTarget - s.mix) * s.slew;
    s.width += (s.widthTarget - s.width) * s.slew;
    // Remove DC only from the wet send. Dry routing stays sample-exact at MIX=0.
    const hpL = left - s.dcInL + s.dcPole * s.dcOutL,
      hpR = right - s.dcInR + s.dcPole * s.dcOutR;
    s.dcInL = left;
    s.dcInR = right;
    s.dcOutL = hpL;
    s.dcOutR = hpR;
    s.preL[s.preWrite] = hpL;
    s.preR[s.preWrite] = hpR;
    const sendL = diffuse(
      s.diffusers[1],
      diffuse(s.diffusers[0], read(s.preL, s.preWrite, s.preDelay)),
    );
    const sendR = diffuse(
      s.diffusers[3],
      diffuse(s.diffusers[2], read(s.preR, s.preWrite, s.preDelay)),
    );
    s.preWrite = (s.preWrite + 1) % s.preL.length;
    let wetL = 0,
      wetR = 0;
    for (let n = 0; n < 8; n++) {
      const line = s.lines[n];
      // A frozen tank locks integer tap lengths: interpolation would slowly drain its energy.
      if (s.freeze === 1) line.delay = Math.round(line.delay);
      else if (!freeze) {
        line.delay += (line.target - line.delay) * s.slew;
        if (Math.abs(line.target - line.delay) < 1e-5) line.delay = line.target;
      }
      const value = read(line.buffer, line.write, line.delay);
      line.low += (value - line.low) * s.tone;
      const damped = line.low + (value - line.low) * s.freeze;
      s.values[n] = damped * (line.gain + (1 - line.gain) * s.freeze);
      wetL += value * OUT_LEFT[n];
      wetR += value * OUT_RIGHT[n];
    }
    // Normalised Hadamard mixing redistributes energy without amplifying it.
    for (let stride = 1; stride < 8; stride *= 2)
      for (let block = 0; block < 8; block += stride * 2)
        for (let j = 0; j < stride; j++) {
          const a = block + j,
            b = a + stride,
            x = s.values[a],
            y = s.values[b];
          s.values[a] = x + y;
          s.values[b] = x - y;
        }
    const injection = (1 - s.freeze) * 0.25;
    for (let n = 0; n < 8; n++) {
      const line = s.lines[n];
      line.buffer[line.write] = clamp(
        s.values[n] * NORM + (sendL * LEFT[n] + sendR * RIGHT[n]) * injection,
        -16,
        16,
      );
      line.write = (line.write + 1) % line.buffer.length;
    }
    wetL *= NORM;
    wetR *= NORM;
    const mid = (wetL + wetR) * 0.5,
      side = (wetL - wetR) * 0.5 * s.width;
    o.left = clamp(left * (1 - s.mix) + (mid + side) * s.mix, -40, 40);
    o.right = clamp(right * (1 - s.mix) + (mid - side) * s.mix, -40, 40);
  },
  getDisplayState: (s) => ({ frozen: s.frozen }),
};
export default processor;
