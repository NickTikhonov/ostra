// @ts-check
import { random } from '../../audio/dsp.js';
import { clamp } from './data.js';
/** @typedef {import('./data.js').SequenceData} SequenceData */
/** @typedef {{phase:number, step:number, direction:number, fire:boolean, lastReset:boolean, lastClock:boolean, seed:number, elapsed:number, clockAge:number, period:number, seenClock:boolean, external:boolean, addressed:boolean, addressMode:number, address:number, voltage:number, target:number, start:number, glideAge:number, initialized:boolean, lastData:SequenceData|null, length:number}} State */
/** @param {number} step @param {number} length @param {SequenceData} data */
const eligible = (step, length, data) => step >= 0 && step < length && !data.skips[step];
/** Find a non-skipped stage with bounded work, including all-skipped patterns.
 * @param {number} start @param {number} direction @param {number} length @param {SequenceData} data
 */
function seek(start, direction, length, data) {
  for (let i = 0; i < length; i++) {
    const step = (((start + i * direction) % length) + length) % length;
    if (!data.skips[step]) return step;
  }
  return -1;
}
/** @param {State} s @param {number} mode @param {number} length @param {SequenceData} data */
function nextStep(s, mode, length, data) {
  if (mode === 1) {
    let count = 0;
    for (let i = 0; i < length; i++) if (!data.skips[i]) count++;
    let pick = Math.floor(random(s) * count);
    for (let i = 0; i < length; i++) if (!data.skips[i] && pick-- === 0) return i;
    return -1;
  }
  if (s.step < 0) return seek(mode === 2 ? length - 1 : 0, mode === 2 ? -1 : 1, length, data);
  if (mode === 3) {
    const first = seek(0, 1, length, data),
      last = seek(length - 1, -1, length, data);
    if (first < 0 || first === last) return first;
    if (s.step >= last) s.direction = -1;
    if (s.step <= first) s.direction = 1;
    return seek(s.step + s.direction, s.direction, length, data);
  }
  const direction = mode === 2 ? -1 : mode === 4 ? (random(s) < 0.5 ? -1 : 1) : 1;
  return seek(s.step + direction, direction, length, data);
}
/** @satisfies {import('../types').ModuleProcessor<State>} */
const processor = {
  createState: (_sr, id) => ({
    phase: 1,
    step: -1,
    direction: 1,
    fire: false,
    lastReset: false,
    lastClock: false,
    seed: Array.from(id).reduce(
      (seed, c) => (Math.imul(seed, 31) + c.charCodeAt(0)) >>> 0,
      1234567,
    ),
    elapsed: 0,
    clockAge: 0,
    period: 0,
    seenClock: false,
    external: false,
    addressed: false,
    addressMode: 0,
    address: -1,
    voltage: 0,
    target: 0,
    start: 0,
    glideAge: 0,
    initialized: false,
    lastData: null,
    length: 8,
  }),
  process({ params: p, inputs, connected, outputs, state: s, data: raw, sampleRate: sr }) {
    const data = /** @type {SequenceData} */ (raw);
    const length = Math.round(p.length),
      mode = Math.round(p.mode);
    const external = !!connected.clock,
      addressed = !!connected.stage;
    const clock = inputs.clock > 1,
      reset = inputs.reset > 1;
    const dt = 1 / sr,
      internalPeriod = 60 / (p.tempo * 2);
    const routingChanged =
      external !== s.external || addressed !== s.addressed || data.addressMode !== s.addressMode;
    if (external !== s.external) {
      s.seenClock = false;
      s.period = 0;
      s.clockAge = 0;
      s.phase = 0;
    }
    s.external = external;
    s.addressed = addressed;
    s.addressMode = data.addressMode;
    s.clockAge += dt;
    const edge = clock && !s.lastClock;
    if (external && edge) {
      if (s.seenClock) s.period = Math.max(dt, s.clockAge);
      s.clockAge = 0;
      s.seenClock = true;
    }
    const restart = reset && !s.lastReset;
    if (restart) {
      s.step = -1;
      s.direction = 1;
      s.fire = false;
      s.phase = 1;
    }
    s.lastReset = reset;
    s.lastClock = clock;
    let tick = external && edge;
    if (!external) {
      s.phase += dt / internalPeriod;
      if (s.phase >= 1) {
        s.phase %= 1;
        tick = true;
      }
    }
    let next = s.step,
      enter = false;
    if (addressed) {
      // Full 0–5V span maps to the currently selected sequence length.
      const address = Math.min(length - 1, Math.floor(clamp(inputs.stage / 5, 0, 1) * length));
      if (data.addressMode === 0) {
        if (
          address !== s.address ||
          routingChanged ||
          restart ||
          data !== s.lastData ||
          length !== s.length
        ) {
          next = seek(address, 1, length, data);
          enter = next !== s.step || restart;
        }
        // A patched clock may retrigger a held address; an unpatched clock does not.
        if (external && edge) {
          next = seek(address, 1, length, data);
          enter = true;
        }
      } else if (tick) {
        next = seek(address, 1, length, data);
        enter = true;
      }
      s.address = address;
    } else if (tick) {
      next = nextStep(s, mode, length, data);
      enter = true;
    }
    if (next >= 0 && !eligible(next, length, data)) {
      next = seek(next, mode === 2 ? -1 : 1, length, data);
      enter = true;
    }
    s.lastData = data;
    s.length = length;
    if (enter) {
      s.step = next;
      s.elapsed = 0;
      s.fire = next >= 0 && data.gates[next] && random(s) < p.chance * data.probabilities[next];
    }
    if (s.step < 0) s.fire = false;
    // Before the first external edge, expose the first enabled CV without firing a gate.
    const preview =
      s.step < 0 && !s.initialized
        ? seek(mode === 2 ? length - 1 : 0, mode === 2 ? -1 : 1, length, data)
        : s.step;
    if (preview >= 0) {
      const target = data.steps[preview];
      if (!s.initialized) {
        s.voltage = target;
        s.target = target;
        s.start = target;
        s.initialized = true;
      }
      if (target !== s.target || enter) {
        s.start = s.voltage;
        s.target = target;
        s.glideAge = 0;
      }
      const glide = data.slides[preview] ? p.glide : 0;
      s.glideAge += dt;
      s.voltage =
        glide > 0 ? s.start + (s.target - s.start) * Math.min(1, s.glideAge / glide) : s.target;
    }
    outputs.pitch = s.voltage;
    const duration =
      (external && s.period > 0 ? s.period : internalPeriod) * (data.gateLengths[s.step] ?? 0.45);
    const high = data.legacyClockGate && external ? clock : s.elapsed < duration;
    outputs.gate = s.fire && data.gates[s.step] && high ? 5 : 0;
    s.elapsed += dt;
  },
  getDisplayState: (s) => ({
    step: s.step,
    voltage: s.voltage,
    external: s.external,
    addressed: s.addressed,
  }),
};
export default processor;
