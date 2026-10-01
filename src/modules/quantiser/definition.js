// @ts-check
import { CHANNELS, createData, restoreData } from './data.js';
/** @type {import('../types').ModuleDefinition} */
export const definition = {
  type: 'quantiser',
  version: 2,
  name: 'PRISM',
  subtitle: 'QUANT / 4',
  category: 'QUANT',
  order: 11,
  color: '#7b4c72',
  panel: '#d5b3cc',
  width: 416,
  layout: 'studio',
  headerLayout: 'compact',
  portStyle: 'badge',
  inputs: [
    ...CHANNELS.flatMap((channel, n) => [
      {
        id: channel.pitch,
        label: `${channel.name} CV`,
        kind: /** @type {'cv'} */ ('cv'),
        x: 35 + n * 100,
        y: 254,
        labelPosition: /** @type {'below'} */ ('below'),
      },
      {
        id: channel.trigger,
        label: `${channel.name} TRIG`,
        kind: /** @type {'gate'} */ ('gate'),
        x: 81 + n * 100,
        y: 254,
        labelPosition: /** @type {'below'} */ ('below'),
      },
    ]),
    { id: 'transpose', label: 'SHIFT', kind: 'cv', x: 380, y: 184, labelPosition: 'below' },
  ],
  outputs: CHANNELS.flatMap((channel, n) => [
    {
      id: channel.pitch,
      label: `${channel.name} CV`,
      kind: /** @type {'cv'} */ ('cv'),
      x: 35 + n * 100,
      y: 324,
      labelPosition: /** @type {'below'} */ ('below'),
    },
    {
      id: channel.trigger,
      label: `${channel.name} Δ`,
      kind: /** @type {'gate'} */ ('gate'),
      x: 81 + n * 100,
      y: 324,
      labelPosition: /** @type {'below'} */ ('below'),
    },
  ]),
  params: [
    { id: 'root', label: 'ROOT', min: 0, max: 11, default: 0, step: 1, smooth: false },
    { id: 'scale', label: 'SCALE', min: 0, max: 6, default: 1, step: 1, smooth: false },
    {
      id: 'octave',
      label: 'OCTAVE',
      min: -3,
      max: 3,
      default: 0,
      step: 1,
      smooth: false,
      unit: 'oct',
    },
  ],
  createData,
  restoreData,
};
