// @ts-check
/** @type {import('../types').ModuleDefinition} */
export const definition = {
  type: 'reverb',
  version: 1,
  name: 'HALO',
  subtitle: 'STEREO REVERB',
  category: 'REVERB',
  order: 6.2,
  color: '#466382',
  panel: '#b9cbdc',
  width: 320,
  layout: 'studio',
  headerLayout: 'compact',
  portStyle: 'badge',
  inputs: [
    { id: 'left', label: 'L/MONO', kind: 'audio', x: 32, y: 80, labelPosition: 'below' },
    { id: 'right', label: 'R', kind: 'audio', x: 32, y: 151, labelPosition: 'below' },
    { id: 'decay', label: 'DECAY', kind: 'cv', x: 288, y: 172, labelPosition: 'below' },
    { id: 'mix', label: 'MIX CV', kind: 'cv', x: 112, y: 318, labelPosition: 'below' },
    { id: 'freeze', label: 'HOLD', kind: 'gate', x: 32, y: 281, labelPosition: 'below' },
  ],
  outputs: [
    { id: 'left', label: 'LEFT', kind: 'audio', x: 288, y: 272, labelPosition: 'below' },
    { id: 'right', label: 'RIGHT', kind: 'audio', x: 288, y: 334, labelPosition: 'below' },
  ],
  params: [
    { id: 'size', label: 'SIZE', min: 0, max: 1, default: 0.5 },
    { id: 'decay', label: 'DECAY', min: 0.2, max: 20, default: 3.5, log: true, unit: 's' },
    { id: 'predelay', label: 'PRE-DELAY', min: 0, max: 0.2, default: 0.018, unit: 's' },
    { id: 'tone', label: 'TONE', min: 600, max: 16000, default: 6500, log: true, unit: 'Hz' },
    { id: 'width', label: 'WIDTH', min: 0, max: 1, default: 0.85 },
    { id: 'mix', label: 'MIX', min: 0, max: 1, default: 0.3 },
    { id: 'freeze', label: 'FREEZE', min: 0, max: 1, default: 0, step: 1, smooth: false },
  ],
};
