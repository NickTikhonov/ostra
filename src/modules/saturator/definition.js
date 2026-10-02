// @ts-check
/** @type {import('../types').ModuleDefinition} */
export const definition = {
  type: 'saturator',
  version: 2,
  name: 'AMBER',
  subtitle: 'STEREO SATURATION',
  category: 'SATURATOR',
  order: 7.1,
  color: '#835025',
  panel: '#e1b878',
  width: 232,
  layout: 'studio',
  headerLayout: 'compact',
  portStyle: 'badge',
  inputs: [
    { id: 'left', label: 'L/MONO', kind: 'audio', x: 34, y: 345, labelPosition: 'below' },
    { id: 'right', label: 'R', kind: 'audio', x: 88, y: 345, labelPosition: 'below' },
  ],
  outputs: [
    { id: 'left', label: 'LEFT', kind: 'audio', x: 144, y: 345, labelPosition: 'below' },
    { id: 'right', label: 'RIGHT', kind: 'audio', x: 198, y: 345, labelPosition: 'below' },
  ],
  params: [
    { id: 'drive', label: 'DRIVE', min: 1, max: 40, default: 1.5, log: true, unit: 'x' },
    { id: 'scorch', label: 'SCORCH', min: 0, max: 1, default: 0, step: 1 },
    { id: 'warmth', label: 'WARMTH', min: 0, max: 1, default: 0.35 },
    { id: 'mix', label: 'MIX', min: 0, max: 1, default: 0.5 },
    { id: 'level', label: 'LEVEL', min: 0, max: 1.5, default: 1 },
  ],
};
