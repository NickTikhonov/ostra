import { createModule, DEFINITIONS, type ModuleType, type Patch } from './modules';

/** A real, self-playing instrument. No samples, autoplay or prerecorded soundtrack. */
export function tutorialDemo(width = 1280, height = 800): Patch {
  const module = (id: string, type: ModuleType, params: Record<string, number>) => ({
    ...createModule(type),
    id: `garden-${id}`,
    params: { ...createModule(type).params, ...params },
  });
  const rows = [
    [
      module('rhythm', 'euclidean', {
        tempo: 74,
        steps: 16,
        hits: 5,
        chance: 0.91,
        stepsB: 23,
        hitsB: 7,
        rotateB: 3,
        chanceB: 0.82,
        stepsC: 31,
        hitsC: 9,
        rotateC: 8,
        chanceC: 0.73,
      }),
      module('chance', 'random', { range: 1.75, slew: 2.8, polarity: 0 }),
      module('scale', 'quantiser', { scale: 4, root: 2 }),
      module('drift', 'lfo', { rate: 0.043, depth: 2 }),
      module('mix', 'stereo-mixer', {
        level1: 0.65,
        level2: 0.65,
        level3: 0.5,
        pan1: -0.6,
        pan2: 0.55,
        pan3: 0.1,
        send1: 0.48,
        send2: 0.38,
        send3: 0.24,
        return: 0.55,
        master: 0.85,
      }),
    ],
    [
      module('bell', 'percussion', {
        model: 1,
        tune: -12,
        color: 0.58,
        morph: 0.62,
        decay: 2.4,
        strike: 0.06,
        level: 0.7,
      }),
      module('pluck', 'percussion', {
        model: 0,
        tune: -24,
        color: 0.48,
        morph: 0.36,
        decay: 1.7,
        strike: 0.12,
        level: 0.75,
      }),
      module('wood', 'percussion', {
        model: 2,
        tune: -36,
        color: 0.28,
        morph: 0.62,
        decay: 0.42,
        strike: 0.42,
        level: 0.65,
      }),
      module('memory', 'shift-register', { tap: 3 }),
      module('tape', 'tape-delay', {
        time: 0.61,
        feedback: 0.58,
        drive: 1.6,
        tone: 3400,
        age: 0.28,
        wow: 0.3,
        hiss: 0,
        mix: 1,
      }),
      module('space', 'reverb', { mix: 1, size: 0.78, decay: 5.8, tone: 5500, width: 1 }),
    ],
  ];
  const rowWidth = Math.max(
    ...rows.map((row) => row.reduce((sum, m) => sum + DEFINITIONS[m.type].width + 12, 72)),
  );
  // This read-only exhibit may zoom out farther than the editable lesson rack.
  const heroHeight = width <= 760 ? 390 : 266;
  const zoom = Math.max(
    0.15,
    Math.min(0.8, (width - 40) / rowWidth, (height - heroHeight - 24) / 852),
  );
  const worldWidth = Math.max(rowWidth, width / zoom);
  for (const [rowIndex, row] of rows.entries()) {
    let x = (worldWidth - row.reduce((sum, m) => sum + DEFINITIONS[m.type].width + 12, -12)) / 2;
    for (const m of row) {
      m.x = x;
      m.y = 42 + rowIndex * 430;
      x += DEFINITIONS[m.type].width + 12;
    }
  }
  const output = module('master', 'output', { level: 0.46 });
  const routes = [
    ['rhythm', 'hit', 'chance', 'clock'],
    ['chance', 'step', 'memory', 'in'],
    ['rhythm', 'hitB', 'memory', 'clock'],
    ['chance', 'step', 'scale', 'pitch'],
    ['memory', 'tap2', 'scale', 'pitch2'],
    ['memory', 'tap4', 'scale', 'pitch3'],
    ['rhythm', 'hit', 'bell', 'trigger'],
    ['rhythm', 'hitB', 'pluck', 'trigger'],
    ['rhythm', 'hitC', 'wood', 'trigger'],
    ['scale', 'pitch', 'bell', 'pitch'],
    ['scale', 'pitch2', 'pluck', 'pitch'],
    ['scale', 'pitch3', 'wood', 'pitch'],
    ['drift', 'sine', 'bell', 'morph'],
    ['drift', 'triangle', 'pluck', 'color'],
    ['drift', 'sine', 'tape', 'time'],
    ['chance', 'smooth', 'wood', 'color'],
    ['chance', 'smooth', 'space', 'decay'],
    ['bell', 'out', 'mix', 'left1'],
    ['pluck', 'out', 'mix', 'left2'],
    ['wood', 'out', 'mix', 'left3'],
    ['mix', 'sendL', 'tape', 'in'],
    ['tape', 'wet', 'space', 'left'],
    ['space', 'left', 'mix', 'returnL'],
    ['space', 'right', 'mix', 'returnR'],
    ['mix', 'left', 'master', 'left'],
    ['mix', 'right', 'master', 'right'],
  ];
  return {
    version: 2,
    modules: rows.flat(),
    output,
    zoom,
    cables: routes.map(([from, fromPort, to, toPort], i) => ({
      id: `garden-cable-${i}`,
      from: `garden-${from}`,
      fromPort,
      to: `garden-${to}`,
      toPort,
      color:
        i < 3 || (i >= 6 && i <= 8)
          ? '#d6b95f'
          : i < 17
            ? ['#83afa1', '#9690c6', '#e68554'][i % 3]
            : '#669caf',
    })),
  };
}
