// @ts-check
import { TRACKS } from './tracks.js';
/** @type {import('../types').ModuleDefinition} */
export const definition = {
  type: 'euclidean',
  version: 2,
  name: 'PULSE',
  subtitle: '3 × EUCLIDEAN',
  category: 'EUCLIDEAN',
  order: 3.1,
  color: '#704c69',
  panel: '#c9b4d0',
  width: 320,
  layout: 'studio',
  headerLayout: 'compact',
  portStyle: 'badge',
  inputs: [
    { id: 'clock', label: 'CLOCK', kind: 'gate', x: 110, y: 273, labelPosition: 'below' },
    { id: 'reset', label: 'RESET', kind: 'gate', x: 175, y: 273, labelPosition: 'below' },
  ],
  outputs: [
    { id: 'hit', label: 'HIT A', kind: 'gate', x: 36, y: 337, labelPosition: 'below' },
    { id: 'hitB', label: 'HIT B', kind: 'gate', x: 98, y: 337, labelPosition: 'below' },
    { id: 'hitC', label: 'HIT C', kind: 'gate', x: 160, y: 337, labelPosition: 'below' },
    { id: 'rest', label: 'REST A', kind: 'gate', x: 222, y: 337, labelPosition: 'below' },
    { id: 'cycle', label: 'CYCLE A', kind: 'gate', x: 284, y: 337, labelPosition: 'below' },
  ],
  params: [
    ...TRACKS.flatMap((track, n) => [
      {
        id: track.steps,
        label: 'STEPS',
        min: 1,
        max: 32,
        default: 16,
        step: 1,
        unit: 'steps',
        smooth: false,
      },
      {
        id: track.hits,
        label: 'HITS',
        min: 0,
        max: 32,
        default: [5, 7, 3][n],
        step: 1,
        unit: 'steps',
        smooth: false,
      },
      {
        id: track.rotate,
        label: 'ROTATE',
        min: 0,
        max: 31,
        default: 0,
        step: 1,
        unit: 'steps',
        smooth: false,
      },
      { id: track.chance, label: 'CHANCE', min: 0, max: 1, default: 1 },
    ]),
    { id: 'tempo', label: 'TEMPO', min: 30, max: 240, default: 110, step: 1, unit: 'BPM' },
  ],
};
