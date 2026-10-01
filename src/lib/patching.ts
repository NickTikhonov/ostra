import { COLORS, DEFINITIONS, type Patch } from './modules';

export type CableEnd = { module: string; port: string; direction: 'in' | 'out' };
export type PendingCable = { fixed: CableEnd; color: string; cableId?: string };

export function sameEnd(a: CableEnd, b: CableEnd) {
  return a.module === b.module && a.port === b.port && a.direction === b.direction;
}

/** Pick up the clicked endpoint, keeping its opposite endpoint anchored. */
export function beginCable(patch: Patch, end: CableEnd, additional = false): PendingCable {
  if (!additional) {
    // Fan-out outputs select the newest cable, which is drawn on top.
    for (let n = patch.cables.length - 1; n >= 0; n--) {
      const cable = patch.cables[n];
      const matches =
        end.direction === 'in'
          ? cable.to === end.module && cable.toPort === end.port
          : cable.from === end.module && cable.fromPort === end.port;
      if (matches)
        return {
          cableId: cable.id,
          color: cable.color,
          fixed:
            end.direction === 'in'
              ? { module: cable.from, port: cable.fromPort, direction: 'out' }
              : { module: cable.to, port: cable.toPort, direction: 'in' },
        };
    }
  }
  return { fixed: end, color: COLORS[patch.cables.length % COLORS.length] };
}

/** Commit once so cancel, undo, and autosave never see an intermediate unplug. */
export function finishCable(patch: Patch, pending: PendingCable, end: CableEnd): Patch | null {
  if (pending.fixed.direction === end.direction) return null;
  const from = pending.fixed.direction === 'out' ? pending.fixed : end;
  const to = pending.fixed.direction === 'in' ? pending.fixed : end;
  const source = patch.modules.find((m) => m.id === from.module),
    target = patch.modules.find((m) => m.id === to.module);
  if (
    !source ||
    !target ||
    !DEFINITIONS[source.type].outputs.some((p) => p.id === from.port) ||
    !DEFINITIONS[target.type].inputs.some((p) => p.id === to.port)
  )
    return null;
  const original = pending.cableId ? patch.cables.find((c) => c.id === pending.cableId) : undefined;
  if (pending.cableId && !original) return null;
  if (
    original &&
    original.from === from.module &&
    original.fromPort === from.port &&
    original.to === to.module &&
    original.toPort === to.port
  )
    return null;
  const cable = {
    id: original?.id ?? crypto.randomUUID(),
    from: from.module,
    fromPort: from.port,
    to: to.module,
    toPort: to.port,
    color: pending.color,
  };
  return {
    ...patch,
    cables: [
      ...patch.cables.filter(
        (c) => c.id !== original?.id && !(c.to === to.module && c.toPort === to.port),
      ),
      cable,
    ],
  };
}
