// @ts-check
/** @type {import("../types").ModuleDefinition} */
export const definition = {
  type: 'vca',
  version: 1,
  name: 'VEIL',
  subtitle: 'VCA',
  category: 'VCA',
  order: 0,
  color: '#35584c',
  panel: '#aacfb7',
  width: 184,
  layout: 'studio',
  footer: 'FIELD / 01',
  inputs: [
    {
      id: 'in',
      label: 'SIGNAL',
      kind: 'audio',
      x: 32,
      y: 82,
      labelPosition: 'below',
    },
    {
      id: 'cv',
      label: 'LEVEL',
      kind: 'cv',
      x: 32,
      y: 231,
      labelPosition: 'below',
    },
  ],
  outputs: [
    {
      id: 'out',
      label: 'OUT',
      kind: 'audio',
      x: 148,
      y: 319,
      labelPosition: 'below',
    },
  ],
  params: [
    {
      id: 'gain',
      label: 'BIAS',
      min: 0,
      max: 1,
      default: 0,
    },
    {
      id: 'depth',
      label: 'CV',
      min: 0,
      max: 1,
      default: 1,
    },
    {
      id: 'curve',
      label: 'CURVE',
      min: 0,
      max: 1,
      default: 0.2,
    },
  ],
  headerLayout: 'compact',
  portStyle: 'badge',
};
