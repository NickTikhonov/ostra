import {
  DEFINITIONS,
  LEFT,
  TOP,
  ROW_HEIGHT,
  MODULE_HEIGHT,
  type RackModule,
  type Patch,
} from './modules';

const GRID = 8,
  GAP = 8;
const ceil = (x: number) => LEFT + Math.ceil((x - LEFT) / GRID) * GRID;
const floor = (x: number) => LEFT + Math.floor((x - LEFT) / GRID) * GRID;
/** Search every free interval on the nearest row before considering another row. */
export function placeModule(
  modules: RackModule[],
  width: number,
  desired: { x: number; y: number },
  rightEdge: number,
  excludeId?: string,
) {
  const others = modules.filter((m) => m.id !== excludeId);
  const startRow = Math.max(0, Math.round((desired.y - TOP) / ROW_HEIGHT));
  const right = Math.max(rightEdge, LEFT + width);
  const desiredX = LEFT + Math.round((desired.x - LEFT) / GRID) * GRID;
  const rows = [startRow];
  for (let distance = 1; distance <= others.length + 1; distance++) {
    rows.push(startRow + distance);
    if (startRow >= distance) rows.push(startRow - distance);
  }
  for (const row of rows) {
    const y = TOP + row * ROW_HEIGHT;
    if (y > 22000) continue;
    const occupied = others
      .filter((m) => Math.abs(m.y - y) < MODULE_HEIGHT)
      .sort((a, b) => a.x - b.x);
    const gaps: { lo: number; hi: number }[] = [];
    let left = LEFT;
    for (const m of occupied) {
      if (m.x - GAP - left >= width) gaps.push({ lo: ceil(left), hi: floor(m.x - GAP - width) });
      left = Math.max(left, m.x + DEFINITIONS[m.type].width + GAP);
    }
    if (right - left >= width) gaps.push({ lo: ceil(left), hi: floor(right - width) });
    const candidates = gaps
      .filter((g) => g.lo <= g.hi)
      .map((g) => {
        let x = Math.max(g.lo, Math.min(g.hi, desiredX));
        // Magnetise nearby edges without moving any of the existing modules.
        if (Math.abs(x - g.lo) <= 12) x = g.lo;
        else if (Math.abs(x - g.hi) <= 12) x = g.hi;
        return x;
      });
    if (candidates.length) {
      candidates.sort((a, b) => Math.abs(a - desired.x) - Math.abs(b - desired.x));
      return { x: candidates[0], y };
    }
  }
  // The rack can expand horizontally when every reachable row is occupied.
  const y = TOP + startRow * ROW_HEIGHT;
  const x = ceil(
    Math.max(
      LEFT,
      ...others
        .filter((m) => Math.abs(m.y - y) < MODULE_HEIGHT)
        .map((m) => m.x + DEFINITIONS[m.type].width + GAP),
    ),
  );
  return { x, y };
}

/** Wider redesigned panels can overlap old saved positions; retain every setting. */
export function repairPanelOverlaps(patch: Patch): Patch {
  const placed: RackModule[] = [];
  const right = Math.max(1100, ...patch.modules.map((m) => m.x + DEFINITIONS[m.type].width + LEFT));
  for (const m of [...patch.modules].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const width = DEFINITIONS[m.type].width;
    const overlap = placed.some(
      (n) =>
        Math.abs(n.y - m.y) < MODULE_HEIGHT &&
        m.x < n.x + DEFINITIONS[n.type].width &&
        m.x + width > n.x,
    );
    placed.push(overlap ? { ...m, ...placeModule(placed, width, m, right) } : m);
  }
  const byId = new Map(placed.map((m) => [m.id, m]));
  return { ...patch, modules: patch.modules.map((m) => byId.get(m.id)!) };
}
