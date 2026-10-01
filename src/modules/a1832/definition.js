// @ts-check
/** @type {import("../types").ModuleDefinition} */
export const definition = {
  type: 'a1832',
  version: 1,
  name: 'TILT',
  subtitle: 'OFFSET',
  color: '#7d513b',
  panel: '#dfba96',
  width: 80,
  layout: 'faceplate',
  footer: 'FIELD / ARCHIVE',
  inputs: [
    {
      id: 'in',
      label: 'In',
      x: 40,
      y: 250,
      kind: 'cv',
    },
  ],
  outputs: [
    {
      id: 'out1',
      label: 'Out 1',
      x: 40,
      y: 298,
      kind: 'cv',
    },
    {
      id: 'out2',
      label: 'Out 2',
      x: 40,
      y: 346,
      kind: 'cv',
    },
  ],
  params: [
    {
      id: 'offset',
      label: 'Offset',
      min: -5,
      max: 5,
      default: 0,
      unit: 'V',
    },
    {
      id: 'amount',
      label: 'Att.',
      min: 0,
      max: 1,
      default: 0.5,
    },
    {
      id: 'mode',
      label: 'Attenuator / Polarizer',
      min: 0,
      max: 1,
      default: 1,
      step: 1,
      smooth: false,
    },
  ],
  hidden: true,
};
