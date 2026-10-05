import { DEFINITIONS } from '../modules/definitions.generated.js';
import type { ModuleInstance } from '../modules/types';
export { DEFINITIONS };
export type { Param, Port, ModuleDefinition } from '../modules/types';
export type ModuleType = keyof typeof DEFINITIONS;
export type RackModule = ModuleInstance & { type: ModuleType };
export type Cable = {
  id: string;
  from: string;
  fromPort: string;
  to: string;
  toPort: string;
  color: string;
};
export type Patch = {
  version: 2;
  modules: RackModule[];
  cables: Cable[];
  zoom: number;
  output?: RackModule;
};
export function patchModules(patch: Patch): RackModule[] {
  return patch.output ? [...patch.modules, patch.output] : patch.modules;
}
export const STORAGE_KEY = 'modular-workshop:patch:v2';
export const TUTORIAL_KEY = 'ostra:tutorial:v1';
export const COLORS = ['#e68554', '#83afa1', '#d6b95f', '#9690c6', '#669caf'];
export const MAX_MODULES = 48;
// One cable per input: every patch the editor can create must remain loadable.
export const MAX_CABLES =
  MAX_MODULES * Math.max(...Object.values(DEFINITIONS).map((d) => d.inputs.length)) +
  DEFINITIONS.output.inputs.length;
export const MODULE_HEIGHT = 380;
export const ROW_HEIGHT = 430;
export const TOP = 42;
export const LEFT = 42;
export function createModule(type: ModuleType, x = LEFT, y = TOP): RackModule {
  const definition = DEFINITIONS[type];
  return {
    id: crypto.randomUUID(),
    type,
    version: definition.version,
    x,
    y,
    params: Object.fromEntries(definition.params.map((p) => [p.id, p.default])),
    data: definition.createData?.() ?? {},
  };
}
export function starterPatch(): Patch {
  // Local Da Funk performance patch. Sources and musical choices: docs/da-funk-patch.md.
  const rows: [string, ModuleType][][] = [
    [
      ['sequencer', 'sequencer'],
      ['oscillator', 'oscillator'],
      ['fourth-oscillator', 'oscillator'],
      ['voice-mixer', 'cv-mixer'],
      ['filter', 'filter'],
      ['distortion', 'distortion'],
      ['envelope', 'envelope'],
      ['vca', 'vca'],
    ],
    [
      ['acid-sequencer', 'sequencer'],
      ['acid-oscillator', 'oscillator'],
      ['acid-filter', 'filter'],
      ['acid-envelope', 'dual-envelope'],
      ['acid-amplitude', 'envelope'],
      ['acid-distortion', 'distortion'],
      ['accent-sequencer', 'sequencer'],
      ['lfo', 'lfo'],
    ],
    [
      ['clock', 'clock'],
      ['divider', 'divider'],
      ['bass-oscillator', 'oscillator'],
      ['bass-filter', 'filter'],
      ['euclidean', 'euclidean'],
      ['kick-oscillator', 'oscillator'],
      ['kick-envelope', 'dual-envelope'],
      ['kick-vca', 'vca'],
      ['master-mixer', 'stereo-mixer'],
    ],
    [
      ['random', 'random'],
      ['noise-filter', 'filter'],
      ['drum-envelope', 'dual-envelope'],
      ['drum-vca', 'vca'],
      ['drum-mixer', 'cv-mixer'],
      ['stereo-mixer', 'stereo-mixer'],
      ['delay', 'delay'],
      ['reverb', 'reverb'],
      ['output', 'output'],
    ],
  ];
  const modules = rows.flatMap((entries, row) => {
    let x = LEFT;
    return entries.map(([key, type]) => {
      const module = { ...createModule(type, x, TOP + row * ROW_HEIGHT), id: `initial-${key}` };
      x += DEFINITIONS[type].width + 8;
      return module;
    });
  });
  const voice = (key: string) => modules.find((m) => m.id === `initial-${key}`)!;
  const tune = (key: string, params: Record<string, number>) =>
    Object.assign(voice(key).params, params);
  const sequence = (
    key: string,
    notes: (number | null)[],
    ties: number[] = [],
    slides: number[] = [],
  ) => {
    const module = voice(key),
      capacity = Math.ceil(notes.length / 8) * 8;
    tune(key, {
      tempo: 222,
      length: notes.length,
      chance: 1,
      mode: 0,
      glide: slides.length ? 0.06 : 0,
    });
    let held = notes.find((note) => note !== null) ?? 60;
    Object.assign(module.data, {
      steps: Array.from({ length: capacity }, (_, i) => {
        if (notes[i] != null) held = notes[i]!;
        return (held - 60) / 12;
      }),
      gates: Array.from({ length: capacity }, (_, i) => notes[i] != null),
      skips: Array(capacity).fill(false),
      locks: Array(capacity).fill(false),
      probabilities: Array(capacity).fill(1),
      gateLengths: Array.from({ length: capacity }, (_, i) => (ties.includes(i) ? 1 : 0.55)),
      slides: Array.from({ length: capacity }, (_, i) => slides.includes(i)),
      rangeMin: -3,
      rangeMax: 1,
      legacyClockGate: false,
    });
  };
  // Community MIDI, track 2, first four bars: [sixteenth onset, duration, MIDI pitch].
  const leadEvents: [number, number, number][] = [
    [0, 6, 67],
    [8, 1, 65],
    [10, 1, 67],
    [12, 1, 70],
    [14, 8, 62],
    [24, 1, 60],
    [26, 1, 62],
    [28, 1, 65],
    [30, 8, 58],
    [40, 1, 57],
    [42, 1, 58],
    [44, 1, 62],
    [46, 8, 55],
    [56, 3, 57],
    [60, 3, 58],
  ];
  const lead: (number | null)[] = Array(64).fill(null);
  for (const [start, duration, note] of leadEvents) lead.fill(note, start, start + duration);
  sequence(
    'sequencer',
    lead,
    lead.flatMap((note, i) => (note === null ? [] : [i])),
  );
  // Olney's 303 transcription. Slides mark the destination; ties mark the source.
  const acidSlides = [2, 4, 6, 8, 10, 11, 13, 14, 15];
  sequence(
    'acid-sequencer',
    [31, 58, 43, 53, 39, 25, 25, 37, 51, 27, 53, 55, 32, 31, 24, 43],
    acidSlides,
    acidSlides.map((i) => (i + 1) % 16),
  );
  // A separate, editable voltage lane opens the filter on the source's accented steps.
  sequence('accent-sequencer', Array(16).fill(60));
  Object.assign(voice('accent-sequencer').data, {
    steps: Array.from({ length: 16 }, (_, i) => ([4, 5, 6, 7, 11].includes(i) ? 5 : 0)),
    rangeMin: 0,
    rangeMax: 5,
  });
  tune('clock', { bpm: 111, rate: 2, swing: 0 });
  tune('oscillator', { tune: 0, fine: 0, fm: 0 });
  tune('fourth-oscillator', { tune: 5, fine: -3, fm: 0 });
  tune('voice-mixer', { a1: 0.5, b1: 0.5, a2: 0.65, b2: 0.4, a3: 0.22, link23: 1 });
  tune('filter', { cutoff: 1100, resonance: 0.3, depth: 1.3 });
  tune('distortion', { drive: 5, mix: 0.85, mode: 1, dirt: 0.12, tone: 4600 });
  tune('envelope', { attack: 0.014, decay: 0.2, sustain: 0.65, release: 0.075 });
  tune('vca', { gain: 0, depth: 0.85, curve: 0.3, gain2: 0, depth2: 0.75, curve2: 0.35 });
  tune('acid-oscillator', { tune: 0, fine: 0, width: 0.35, fm: 0 });
  tune('acid-filter', { cutoff: 380, resonance: 0.87, depth: 3 });
  tune('acid-envelope', { attack1: 0.001, decay1: 0.19, attack2: 0.003, decay2: 0.38 });
  tune('acid-amplitude', { attack: 0.002, decay: 0.17, sustain: 0.55, release: 0.035 });
  tune('acid-distortion', { drive: 7, mix: 0.7, mode: 1, dirt: 0.05, tone: 4200 });
  tune('lfo', { rate: 111 / 60 / 16, depth: 4, polarity: 0 });
  tune('bass-oscillator', { tune: -17, fm: 0 });
  tune('bass-filter', { cutoff: 220, resonance: 0.12, depth: 1.2 });
  tune('euclidean', {
    tempo: 111,
    steps: 16,
    hits: 4,
    rotate: 0,
    stepsB: 16,
    hitsB: 2,
    rotateB: 4,
    stepsC: 16,
    hitsC: 8,
    rotateC: 0,
  });
  tune('kick-oscillator', { tune: -28, fm: 0.55 });
  tune('kick-envelope', { attack1: 0.001, decay1: 0.035, attack2: 0.001, decay2: 0.3 });
  tune('kick-vca', { gain: 0, depth: 1, curve: 0.55 });
  tune('noise-filter', { cutoff: 2000, resonance: 0.05, depth: 0 });
  tune('drum-envelope', { attack1: 0.001, decay1: 0.16, attack2: 0.001, decay2: 0.055 });
  tune('drum-vca', { gain: 0, depth: 0.75, curve: 0.3, gain2: 0, depth2: 0.4, curve2: 0.5 });
  tune('drum-mixer', { a1: 0.8, b1: 0.48, a2: 0.3, link12: 1 });
  tune('stereo-mixer', {
    level1: 0.65,
    level2: 0.3,
    level3: 0.35,
    pan1: -0.15,
    pan2: 0.15,
    send1: 0.18,
    send2: 0.12,
    send3: 0,
    master: 0.8,
  });
  tune('master-mixer', { level1: 0.9, level2: 0.8, level3: 0, return: 0.22, master: 0.85 });
  tune('delay', { time: 45 / 111, feedback: 0.25, tone: 3600, mix: 1 });
  tune('reverb', { size: 0.45, decay: 1.6, predelay: 0.008, tone: 4400, width: 1, mix: 0.35 });
  tune('output', { level: 0.8 });
  const wires: [string, string, string, string, number][] = [
    ['clock', 'clock', 'divider', 'clock', 2],
    ['clock', 'reset', 'divider', 'reset', 2],
    ...['sequencer', 'acid-sequencer', 'accent-sequencer', 'euclidean'].flatMap(
      (key): [string, string, string, string, number][] => [
        ['clock', 'clock', key, 'clock', 2],
        ['clock', 'reset', key, 'reset', 2],
      ],
    ),
    ['sequencer', 'pitch', 'oscillator', 'pitch', 3],
    ['sequencer', 'pitch', 'fourth-oscillator', 'pitch', 3],
    ['oscillator', 'saw', 'voice-mixer', 'a1', 1],
    ['fourth-oscillator', 'saw', 'voice-mixer', 'b1', 1],
    ['voice-mixer', 'out1', 'filter', 'in', 1],
    ['filter', 'band', 'distortion', 'in', 1],
    ['distortion', 'out', 'vca', 'in', 1],
    ['sequencer', 'gate', 'envelope', 'gate', 0],
    ['envelope', 'env', 'vca', 'cv', 0],
    ['envelope', 'env', 'filter', 'cutoff', 0],
    ['acid-sequencer', 'pitch', 'acid-oscillator', 'pitch', 3],
    ['acid-sequencer', 'gate', 'acid-envelope', 'trigger1', 0],
    ['acid-oscillator', 'pulse', 'acid-filter', 'in', 1],
    ['acid-filter', 'low', 'acid-distortion', 'in', 1],
    ['acid-distortion', 'out', 'vca', 'in2', 1],
    ['acid-sequencer', 'gate', 'acid-amplitude', 'gate', 0],
    ['acid-amplitude', 'env', 'vca', 'cv2', 0],
    ['acid-envelope', 'env1', 'voice-mixer', 'a2', 0],
    ['accent-sequencer', 'pitch', 'voice-mixer', 'b2', 3],
    ['lfo', 'sine', 'voice-mixer', 'a3', 4],
    ['voice-mixer', 'out3', 'acid-filter', 'cutoff', 4],
    ['divider', 'div4', 'acid-envelope', 'trigger2', 2],
    ['bass-oscillator', 'saw', 'bass-filter', 'in', 1],
    ['acid-envelope', 'env2', 'bass-filter', 'vca', 0],
    ['acid-envelope', 'env2', 'bass-filter', 'cutoff', 0],
    ['euclidean', 'hit', 'kick-envelope', 'trigger1', 2],
    ['euclidean', 'hit', 'kick-envelope', 'trigger2', 2],
    ['kick-envelope', 'env1', 'kick-oscillator', 'fm', 0],
    ['kick-oscillator', 'sine', 'kick-vca', 'in', 1],
    ['kick-envelope', 'env2', 'kick-vca', 'cv', 0],
    ['euclidean', 'hitB', 'drum-envelope', 'trigger1', 2],
    ['euclidean', 'hitC', 'drum-envelope', 'trigger2', 2],
    ['random', 'noise', 'noise-filter', 'in', 1],
    ['noise-filter', 'band', 'drum-vca', 'in', 1],
    ['noise-filter', 'high', 'drum-vca', 'in2', 1],
    ['drum-envelope', 'env1', 'drum-vca', 'cv', 0],
    ['drum-envelope', 'env2', 'drum-vca', 'cv2', 0],
    ['kick-vca', 'out', 'drum-mixer', 'a1', 1],
    ['drum-vca', 'out', 'drum-mixer', 'b1', 1],
    ['drum-vca', 'out2', 'drum-mixer', 'a2', 1],
    ['vca', 'out', 'stereo-mixer', 'left1', 1],
    ['vca', 'out2', 'stereo-mixer', 'left2', 1],
    ['bass-filter', 'low', 'stereo-mixer', 'left3', 1],
    ['stereo-mixer', 'left', 'master-mixer', 'left1', 1],
    ['stereo-mixer', 'right', 'master-mixer', 'right1', 1],
    ['drum-mixer', 'out2', 'master-mixer', 'left2', 1],
    ['stereo-mixer', 'sendL', 'delay', 'in', 1],
    ['delay', 'out', 'reverb', 'left', 1],
    ['reverb', 'left', 'master-mixer', 'returnL', 1],
    ['reverb', 'right', 'master-mixer', 'returnR', 1],
    ['master-mixer', 'left', 'output', 'left', 1],
    ['master-mixer', 'right', 'output', 'right', 1],
  ];
  return {
    version: 2,
    modules: modules.filter((m) => m.type !== 'output'),
    output: voice('output'),
    cables: wires.map(([a, b, c, d, color], i) => ({
      id: `initial-${i}`,
      from: `initial-${a}`,
      fromPort: b,
      to: `initial-${c}`,
      toPort: d,
      color: COLORS[color],
    })),
    zoom: 0.5,
  };
}
export function validatePatch(value: unknown): Patch {
  if (!value || typeof value !== 'object') throw new Error('Invalid patch');
  const p = value as Patch;
  if (
    p.version !== 2 ||
    !Array.isArray(p.modules) ||
    !Array.isArray(p.cables) ||
    p.modules.length > MAX_MODULES ||
    p.cables.length > MAX_CABLES
  )
    throw new Error('Unsupported patch');
  if (p.output && p.output.type !== 'output') throw new Error('Invalid master output');
  const ids = new Set<string>();
  const modules = patchModules(p).map((m) => {
    if (!m || !Object.hasOwn(DEFINITIONS, m.type) || typeof m.id !== 'string' || ids.has(m.id))
      throw new Error('Invalid module');
    ids.add(m.id);
    const def = DEFINITIONS[m.type];
    if (m.version && m.version > def.version)
      throw new Error(`Unsupported module version: ${m.type}`);
    return {
      id: m.id,
      type: m.type,
      version: def.version,
      x: Number.isFinite(m.x) ? Math.max(LEFT, Math.min(8000, m.x)) : LEFT,
      y: Number.isFinite(m.y) ? Math.max(TOP, Math.min(22000, m.y)) : TOP,
      params: Object.fromEntries(
        def.params.map((param) => {
          const n = m.params?.[param.id];
          return [
            param.id,
            Number.isFinite(n)
              ? Math.min(param.max, Math.max(param.min, param.step ? Math.round(n) : n))
              : param.default,
          ];
        }),
      ),
      data: def.restoreData?.(m as unknown as Record<string, unknown>) ?? def.createData?.() ?? {},
    };
  });
  const occupied = new Set<string>(),
    cableIds = new Set<string>();
  const cables = p.cables
    .filter((c) => {
      if (!c || typeof c.id !== 'string' || cableIds.has(c.id)) return false;
      const a = modules.find((m) => m.id === c.from),
        b = modules.find((m) => m.id === c.to),
        key = `${c.to}:${c.toPort}`;
      if (
        !a ||
        !b ||
        !DEFINITIONS[a.type].outputs.some((x) => x.id === c.fromPort) ||
        !DEFINITIONS[b.type].inputs.some((x) => x.id === c.toPort) ||
        occupied.has(key)
      )
        return false;
      occupied.add(key);
      cableIds.add(c.id);
      return true;
    })
    .map((c) => ({ ...c, color: COLORS.includes(c.color) ? c.color : COLORS[0] }));
  // Lift the original output out of the rack without changing its ID, cables,
  // level or mute. Additional legacy outputs stay visible to preserve old mixes.
  const output =
    (p.output && modules.find((m) => m.id === p.output!.id)) ||
    modules.find((m) => m.type === 'output') ||
    createModule('output');
  return {
    version: 2,
    modules: modules.filter((m) => m.id !== output.id),
    output,
    cables,
    zoom: Number.isFinite(p.zoom) ? Math.min(1.5, Math.max(0.5, p.zoom)) : 1,
  };
}
