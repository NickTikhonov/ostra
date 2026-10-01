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
export type Patch = { version: 2; modules: RackModule[]; cables: Cable[]; zoom: number };
export const STORAGE_KEY = 'modular-workshop:patch:v2';
export const COLORS = ['#e68554', '#83afa1', '#d6b95f', '#9690c6', '#669caf'];
export const MAX_MODULES = 48;
// One cable per input: every patch the editor can create must remain loadable.
export const MAX_CABLES =
  MAX_MODULES * Math.max(...Object.values(DEFINITIONS).map((d) => d.inputs.length));
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
  const rows: ModuleType[][] = [
    ['clock', 'divider', 'sequencer', 'quantiser', 'lfo'],
    ['oscillator', 'filter', 'envelope', 'vca', 'distortion', 'delay', 'output'],
  ];
  const modules = rows.flatMap((types, row) => {
    let x = LEFT;
    return types.map((type) => {
      const module = { ...createModule(type, x, TOP + row * ROW_HEIGHT), id: `initial-${type}` };
      x += DEFINITIONS[type].width + 8;
      return module;
    });
  });
  const wires: [ModuleType, string, ModuleType, string, number][] = [
    ['clock', 'clock', 'divider', 'clock', 2],
    ['clock', 'reset', 'divider', 'reset', 2],
    ['divider', 'div2', 'sequencer', 'clock', 2],
    ['divider', 'div8', 'lfo', 'reset', 4],
    ['sequencer', 'pitch', 'quantiser', 'pitch', 3],
    ['quantiser', 'pitch', 'oscillator', 'pitch', 3],
    ['sequencer', 'gate', 'envelope', 'gate', 0],
    ['envelope', 'env', 'vca', 'cv', 0],
    ['lfo', 'sine', 'filter', 'cutoff', 4],
    ['oscillator', 'saw', 'filter', 'in', 1],
    ['filter', 'low', 'distortion', 'in', 1],
    ['distortion', 'out', 'vca', 'in', 1],
    ['vca', 'out', 'delay', 'in', 1],
    ['clock', 'clock', 'delay', 'clock', 2],
    ['delay', 'out', 'output', 'left', 1],
  ];
  return {
    version: 2,
    modules,
    cables: wires.map(([a, b, c, d, color], i) => ({
      id: `initial-${i}`,
      from: `initial-${a}`,
      fromPort: b,
      to: `initial-${c}`,
      toPort: d,
      color: COLORS[color],
    })),
    zoom: 0.8,
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
  const ids = new Set<string>();
  const modules = p.modules.map((m) => {
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
  return {
    version: 2,
    modules,
    cables,
    zoom: Number.isFinite(p.zoom) ? Math.min(1.5, Math.max(0.5, p.zoom)) : 1,
  };
}
