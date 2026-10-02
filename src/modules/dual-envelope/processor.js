// @ts-check
/** @typedef {{value:number;stage:number;trigger:boolean;manual:boolean;end:number}} Channel */
/** @satisfies {import('../types').ModuleProcessor<{channels:Channel[]}>} */
const processor = {
  createState: () => ({
    channels: Array.from({ length: 2 }, () => ({
      value: 0,
      stage: 0,
      trigger: false,
      manual: false,
      end: 0,
    })),
  }),
  process({ inputs: i, params: p, outputs: o, state: s, sampleRate: sr }) {
    for (let c = 0; c < 2; c++) {
      const channel = s.channels[c],
        n = c + 1;
      const trigger = i[`trigger${n}`] > 1;
      // A trigger always runs a full AD cycle; a held gate never sustains it.
      // Retrigger from the current value to avoid a discontinuous voltage reset.
      if ((trigger && !channel.trigger) || channel.manual) channel.stage = 1;
      channel.trigger = trigger;
      channel.manual = false;
      if (channel.stage === 1) {
        channel.value = Math.min(1, channel.value + 1 / (p[`attack${n}`] * sr));
        if (channel.value >= 1) channel.stage = 2;
      } else if (channel.stage === 2) {
        channel.value = Math.max(0, channel.value - 1 / (p[`decay${n}`] * sr));
        if (channel.value <= 0) {
          channel.stage = 0;
          channel.end = Math.round(sr * 0.01);
        }
      }
      o[`env${n}`] = channel.value * 5;
      o[`end${n}`] = channel.end > 0 ? 5 : 0;
      if (channel.end > 0) channel.end--;
    }
  },
  onEvent({ state }, event) {
    if (event === 'trigger1' || event === 'trigger2')
      state.channels[event === 'trigger1' ? 0 : 1].manual = true;
  },
  getDisplayState: (state) => ({
    env1: state.channels[0].value * 5,
    env2: state.channels[1].value * 5,
  }),
};
export default processor;
