// @ts-check
import { createData, restoreData } from './data.js';
/** @type {import('../types').ModuleDefinition} */
export const definition = {
  type: 'sequencer',
  version: 3,
  name: 'PATH',
  subtitle: 'VOLTAGE / 8',
  category: 'SEQ / 8',
  order: 3,
  color: '#395d7c',
  panel: '#a9c8df',
  width: 520,
  layout: 'studio',
  headerLayout: 'compact',
  portStyle: 'badge',
  footer: 'FIELD / 04',
  inputs: [
    { id: 'clock', label: 'CLOCK', kind: 'gate', x: 382, y: 330, labelPosition: 'below' },
    { id: 'reset', label: 'RESET', kind: 'gate', x: 472, y: 330, labelPosition: 'below' },
    { id: 'stage', label: 'STAGE', kind: 'cv', x: 244, y: 330, labelPosition: 'below' },
  ],
  outputs: [
    // Keep the persisted port ID so existing cables and PRISM patches survive.
    { id: 'pitch', label: 'CV', kind: 'cv', x: 44, y: 330, labelPosition: 'below' },
    { id: 'gate', label: 'GATE', kind: 'gate', x: 104, y: 330, labelPosition: 'below' },
  ],
  params: [
    { id: 'tempo', label: 'RATE', min: 30, max: 240, default: 104, step: 1, unit: 'BPM' },
    { id: 'chance', label: 'GATE CHANCE', min: 0, max: 1, default: 1 },
    // Index 1 remains random for save compatibility.
    { id: 'mode', label: 'ORDER', min: 0, max: 4, default: 0, step: 1, smooth: false },
    {
      id: 'length',
      label: 'LENGTH',
      min: 1,
      max: 8,
      default: 8,
      step: 1,
      smooth: false,
      unit: 'steps',
    },
    { id: 'glide', label: 'GLIDE', min: 0, max: 5, default: 0, unit: 's', smooth: false },
  ],
  createData,
  restoreData,
};
