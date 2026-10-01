// @ts-check
import { CHANNELS, pitchClass, scaleMask } from './data.js';
/** @typedef {{pitch:number,trigger:boolean,pulse:number,flash:number,lastInput:number,lastMask:number,lastOctave:number,valid:boolean,active:boolean}} ChannelState */
/** @typedef {{channels:ChannelState[],mask:number,below:number[],above:number[]}} State */
/** @satisfies {import('../types').ModuleProcessor<State>} */
const processor = {
  createState: () => ({
    mask: -1,
    below: Array(12).fill(0),
    above: Array(12).fill(0),
    channels: CHANNELS.map(() => ({
      pitch: 0,
      trigger: false,
      pulse: 0,
      flash: 0,
      lastInput: NaN,
      lastMask: -1,
      lastOctave: NaN,
      valid: false,
      active: false,
    })),
  }),
  process({ inputs, connected, outputConnected, params, outputs, state, sampleRate, data }) {
    const mask = scaleMask(data, params);
    if (mask !== state.mask) {
      // Rebuild only on scale changes; quantising each channel then takes constant time.
      for (let note = 0; note < 12; note++) {
        let down = 0,
          up = 0;
        while (!(mask & (1 << pitchClass(note - down)))) down++;
        while (!(mask & (1 << pitchClass(note + up)))) up++;
        state.below[note] = down;
        state.above[note] = up;
      }
      state.mask = mask;
    }
    for (let n = 0; n < CHANNELS.length; n++) {
      const channel = CHANNELS[n],
        s = state.channels[n];
      const input = (inputs[channel.pitch] ?? 0) + (inputs.transpose ?? 0),
        trigger = (inputs[channel.trigger] ?? 0) > 1;
      s.active = !!(
        connected[channel.pitch] ||
        connected[channel.trigger] ||
        connected.transpose ||
        outputConnected[channel.pitch]
      );
      const sample = connected[channel.trigger]
        ? trigger && !s.trigger
        : input !== s.lastInput || mask !== s.lastMask || params.octave !== s.lastOctave;
      if (sample) {
        const note = input * 12,
          lo = Math.floor(note),
          hi = Math.ceil(note);
        const lower = lo - state.below[pitchClass(lo)],
          upper = hi + state.above[pitchClass(hi)];
        const nearest = note - lower <= upper - note ? lower : upper;
        const result = Math.max(-10, Math.min(10, nearest / 12 + params.octave));
        if (result !== s.pitch || !s.valid) {
          s.pulse = Math.round(sampleRate * 0.008);
          s.flash = Math.round(sampleRate * 0.09);
        } else if (connected[channel.trigger]) s.flash = Math.round(sampleRate * 0.09);
        s.pitch = result;
        s.lastInput = input;
        s.lastMask = mask;
        s.lastOctave = params.octave;
        s.valid = true;
      }
      s.trigger = trigger;
      outputs[channel.pitch] = s.pitch;
      outputs[channel.trigger] = s.pulse > 0 ? 5 : 0;
      if (s.pulse > 0) s.pulse--;
      if (s.flash > 0) s.flash--;
    }
  },
  getDisplayState: (state) => {
    /** @type {Record<string,number|boolean>} */
    const display = {};
    for (let n = 0; n < CHANNELS.length; n++) {
      const s = state.channels[n];
      display[`active${n}`] = s.active && s.valid;
      display[`note${n}`] = Math.round(s.pitch * 12);
      display[`flash${n}`] = s.flash > 0;
    }
    return display;
  },
};
export default processor;
