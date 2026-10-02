// @ts-check
/** @type {import('../types').ModuleDefinition} */
export const definition = {
  type: 'percussion',
  version: 1,
  name: 'TINE',
  subtitle: 'PERCUSSION VOICE',
  category: 'PERCUSSION',
  order: 4.2,
  color: '#365f6a',
  panel: '#a8c9cc',
  width: 320,
  layout: 'studio',
  headerLayout: 'compact',
  portStyle: 'badge',
  inputs: [
    { id: 'trigger', label: 'TRIG', kind: 'gate', x: 30, y: 333, labelPosition: 'below' },
    { id: 'pitch', label: '1V/OCT', kind: 'cv', x: 82, y: 333, labelPosition: 'below' },
    { id: 'color', label: 'COLOR', kind: 'cv', x: 134, y: 333, labelPosition: 'below' },
    { id: 'morph', label: 'MORPH', kind: 'cv', x: 186, y: 333, labelPosition: 'below' },
    { id: 'decay', label: 'DECAY', kind: 'cv', x: 238, y: 333, labelPosition: 'below' },
    { id: 'accent', label: 'ACCENT', kind: 'cv', x: 290, y: 244, labelPosition: 'below' },
  ],
  outputs: [{ id: 'out', label: 'OUT', kind: 'audio', x: 290, y: 333, labelPosition: 'below' }],
  params: [
    { id: 'model', label: 'MODEL', min: 0, max: 2, default: 0, step: 1, smooth: false },
    { id: 'tune', label: 'TUNE', min: -36, max: 36, default: -12, step: 1, unit: 'st' },
    { id: 'color', label: 'COLOR', min: 0, max: 1, default: 0.48 },
    { id: 'morph', label: 'MORPH', min: 0, max: 1, default: 0.3 },
    { id: 'decay', label: 'DECAY', min: 0.04, max: 6, default: 1.2, log: true, unit: 's' },
    { id: 'strike', label: 'STRIKE', min: 0, max: 1, default: 0.25 },
    { id: 'level', label: 'LEVEL', min: 0, max: 1, default: 0.7 },
  ],
};
