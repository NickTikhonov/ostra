import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
const dir = await mkdtemp(join(tmpdir(), 'modular-tests-'));
for (const name of ['modules', 'placement', 'storage']) {
  const source = await readFile(new URL(`../src/lib/${name}.ts`, import.meta.url), 'utf8');
  const result = ts
    .transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
    })
    .outputText.replaceAll("from './modules'", "from './modules.mjs'")
    .replace("from './placement'", "from './placement.mjs'")
    .replace(
      "'../modules/definitions.generated.js'",
      JSON.stringify(new URL('../src/modules/definitions.generated.js', import.meta.url).href),
    );
  await writeFile(join(dir, `${name}.mjs`), result);
}
after(() => rm(dir, { recursive: true, force: true }));
const { starterPatch, validatePatch, createModule, STORAGE_KEY } = await import(
  pathToFileURL(join(dir, 'modules.mjs')).href
);
const { saveRack, restoreRack } = await import(pathToFileURL(join(dir, 'storage.mjs')).href);
const memory = () => {
  const values = new Map();
  return { getItem: (k) => values.get(k) || null, setItem: (k, v) => values.set(k, v) };
};
test('rack settings, cables, module positions and steps survive saving and restoring', () => {
  const storage = memory(),
    patch = starterPatch();
  patch.modules[0].x = 202;
  patch.modules[0].y = 902;
  patch.modules.find((m) => m.type === 'sequencer').data.steps[4] = -7;
  patch.modules.find((m) => m.type === 'sequencer').data.gates[2] = false;
  patch.modules.find((m) => m.type === 'oscillator').params.tune = -3;
  patch.zoom = 0.8;
  patch.cables.pop();
  saveRack(storage, patch);
  assert.deepEqual(restoreRack(storage).patch, patch);
});
test('intentionally empty rack stays empty across refresh', () => {
  const storage = memory(),
    patch = { version: 2, modules: [], output: createModule('output'), cables: [], zoom: 1 };
  saveRack(storage, patch);
  assert.deepEqual(restoreRack(storage).patch, patch);
});
test('first visit gets one fully connected default patch', () => {
  const result = restoreRack(memory());
  assert.equal(result.patch.modules.length, 11);
  assert.equal(result.patch.cables.length, 15);
  assert.equal(result.recovered, false);
});
test('damaged save is backed up before recovering', () => {
  const storage = memory();
  storage.setItem(STORAGE_KEY, 'broken JSON');
  const result = restoreRack(storage);
  assert.equal(result.recovered, true);
  assert.equal(storage.getItem(`${STORAGE_KEY}:recovery`), 'broken JSON');
  assert.equal(result.patch.modules.length, 11);
});
test('validation removes dangling connections and bounds unsafe settings', () => {
  const patch = starterPatch();
  patch.modules.find((m) => m.type === 'oscillator').params.tune = 100000;
  patch.cables.push({
    id: 'bad',
    from: 'absent',
    fromPort: 'sine',
    to: patch.modules[1].id,
    toPort: 'pitch',
    color: 'red',
  });
  const clean = validatePatch(patch);
  assert.equal(clean.modules.find((m) => m.type === 'oscillator').params.tune, 36);
  assert.equal(clean.cables.length, 15);
});
test('PRISM custom scale, four-channel cables and legacy channel A survive rack persistence', () => {
  const storage = memory(),
    patch = starterPatch(),
    q = patch.modules.find((m) => m.type === 'quantiser');
  q.params.root = 3;
  q.params.octave = -1;
  q.data.noteMask = 145;
  for (const suffix of ['2', '3', '4'])
    patch.cables.push({
      id: `prism-${suffix}`,
      from: 'initial-sequencer',
      fromPort: 'pitch',
      to: q.id,
      toPort: `pitch${suffix}`,
      color: '#e68554',
    });
  saveRack(storage, patch);
  const restored = restoreRack(storage).patch,
    quantiser = restored.modules.find((m) => m.id === q.id);
  assert.equal(quantiser.data.noteMask, 145);
  assert.equal(quantiser.params.root, 3);
  assert.equal(quantiser.params.octave, -1);
  assert.equal(restored.cables.filter((c) => c.to === q.id).length, 4);
  q.version = 1;
  q.data = {};
  saveRack(storage, patch);
  const migrated = restoreRack(storage).patch.modules.find((m) => m.id === q.id);
  assert.equal(migrated.version, 2);
  assert.deepEqual(migrated.data, { noteMask: null });
  assert.equal(migrated.params.root, 3);
});
test('HALO settings and stereo cables survive saving and restoring', () => {
  const storage = memory(),
    patch = starterPatch();
  const reverb = {
    id: 'halo',
    type: 'reverb',
    version: 1,
    x: 42,
    y: 1332,
    params: { size: 0.8, decay: 12, predelay: 0.1, tone: 2400, width: 0.65, mix: 0.7, freeze: 1 },
    data: {},
  };
  patch.modules.push(reverb);
  patch.cables = patch.cables.filter((c) => c.to !== 'initial-output');
  patch.cables.push(
    {
      id: 'halo-in',
      from: 'initial-delay',
      fromPort: 'out',
      to: 'halo',
      toPort: 'left',
      color: '#e68554',
    },
    {
      id: 'halo-l',
      from: 'halo',
      fromPort: 'left',
      to: 'initial-output',
      toPort: 'left',
      color: '#e68554',
    },
    {
      id: 'halo-r',
      from: 'halo',
      fromPort: 'right',
      to: 'initial-output',
      toPort: 'right',
      color: '#e68554',
    },
  );
  saveRack(storage, patch);
  const restored = restoreRack(storage).patch;
  assert.deepEqual(
    restored.modules.find((m) => m.id === 'halo'),
    reverb,
  );
  assert.deepEqual(
    restored.cables.filter((c) => c.id.startsWith('halo-')),
    patch.cables.filter((c) => c.id.startsWith('halo-')),
  );
});
test('new module controls and sample references persist without putting audio bytes in localStorage', async () => {
  const { DEFINITIONS } = await import('../src/modules/definitions.generated.js');
  const types = ['random', 'switch', 'shift-register', 'logic', 'maths', 'stereo-mixer', 'sampler'];
  const modules = types.map((type, n) => ({
    id: `new-${type}`,
    type,
    version: DEFINITIONS[type].version,
    x: 42,
    y: 42 + n * 430,
    params: Object.fromEntries(DEFINITIONS[type].params.map((p) => [p.id, p.default])),
    data: DEFINITIONS[type].createData?.() ?? {},
  }));
  modules[2].params.tap = 3;
  modules[4].params.cycle4 = 1;
  modules[5].params.send1 = 0.75;
  modules[6].data = {
    assetId: 'local-file-id',
    name: 'texture.wav',
    duration: 27.4,
    peaks: [0.2, 0.5, 0.1],
  };
  modules[6].params.mode = 2;
  const cable = {
    id: 'new-cable',
    from: 'new-shift-register',
    fromPort: 'tap4',
    to: 'new-sampler',
    toPort: 'position',
    color: '#e68554',
  };
  const patch = { version: 2, modules, output: createModule('output'), cables: [cable], zoom: 1 },
    storage = memory();
  saveRack(storage, patch);
  assert.deepEqual(restoreRack(storage).patch, patch);
  assert.ok(storage.getItem(STORAGE_KEY).length < 5000);
});

test('dual voice upgrades retain existing channels and restore all added controls and cables', () => {
  const patch = starterPatch(),
    storage = memory();
  const vca = patch.modules.find((m) => m.type === 'vca');
  const env = patch.modules.find((m) => m.type === 'envelope');
  vca.version = 1;
  vca.params = { gain: 0.3, depth: 0.7, curve: 0.8 };
  env.version = 1;
  const originalCables = structuredClone(patch.cables);
  const migrated = validatePatch(patch);
  assert.deepEqual(migrated.cables, originalCables);
  const dual = migrated.modules.find((m) => m.id === vca.id);
  assert.equal(dual.params.gain, 0.3);
  assert.equal(dual.params.depth, 0.7);
  assert.equal(dual.params.curve, 0.8);
  assert.equal(dual.params.gain2, 0);
  assert.equal(dual.params.depth2, 1);
  const ad = createModule('dual-envelope', 42, 902);
  ad.params.attack2 = 0.37;
  migrated.modules.push(ad);
  migrated.cables.push(
    {
      id: 'second-env',
      from: ad.id,
      fromPort: 'env2',
      to: vca.id,
      toPort: 'cv2',
      color: '#e68554',
    },
    {
      id: 'attack-cv',
      from: ad.id,
      fromPort: 'env1',
      to: env.id,
      toPort: 'attack',
      color: '#83afa1',
    },
  );
  saveRack(storage, migrated);
  assert.deepEqual(restoreRack(storage).patch, migrated);
});

test('AMBER stereo routing and settings persist without changing a saved distortion mix', () => {
  const patch = starterPatch(),
    storage = memory();
  const amber = createModule('saturator', 42, 902);
  amber.params.warmth = 0.7;
  amber.params.level = 0.8;
  patch.modules.push(amber);
  const grit = patch.modules.find((m) => m.type === 'distortion');
  grit.params.mix = 0.85;
  patch.cables.push({
    id: 'amber-left',
    from: grit.id,
    fromPort: 'out',
    to: amber.id,
    toPort: 'left',
    color: '#e68554',
  });
  saveRack(storage, patch);
  assert.deepEqual(restoreRack(storage).patch, patch);
});

test('percussion voice and Euclidean pattern survive saving with trigger and output connections', () => {
  const storage = memory(),
    rhythm = createModule('euclidean', 42, 42),
    voice = createModule('percussion', 378, 42),
    output = createModule('output');
  rhythm.params.steps = 13;
  rhythm.params.hits = 7;
  rhythm.params.rotate = 4;
  rhythm.params.chance = 0.8;
  Object.assign(rhythm.params, {
    stepsB: 5,
    hitsB: 2,
    rotateB: 3,
    chanceB: 0.7,
    stepsC: 7,
    hitsC: 4,
    rotateC: 2,
    chanceC: 0.4,
  });
  voice.params.model = 1;
  voice.params.decay = 2.3;
  voice.params.morph = 0.6;
  const patch = {
    version: 2,
    zoom: 1,
    modules: [rhythm, voice],
    output,
    cables: [
      {
        id: 'trigger',
        from: rhythm.id,
        fromPort: 'hit',
        to: voice.id,
        toPort: 'trigger',
        color: '#e68554',
      },
      {
        id: 'audio',
        from: voice.id,
        fromPort: 'out',
        to: output.id,
        toPort: 'left',
        color: '#83afa1',
      },
    ],
  };
  saveRack(storage, patch);
  assert.deepEqual(restoreRack(storage).patch, patch);
});

test('single-track PULSE saves retain parameters and cables while gaining tracks B and C', () => {
  const rhythm = createModule('euclidean'),
    voice = createModule('percussion');
  rhythm.version = 1;
  rhythm.params = { steps: 13, hits: 7, rotate: 4, chance: 0.8, tempo: 123 };
  const cables = ['hit', 'rest', 'cycle'].map((port, n) => ({
    id: `legacy-${n}`,
    from: rhythm.id,
    fromPort: port,
    to: voice.id,
    toPort: ['trigger', 'accent', 'pitch'][n],
    color: '#e68554',
  }));
  const restored = validatePatch({
    version: 2,
    zoom: 1,
    modules: [rhythm, voice],
    output: createModule('output'),
    cables,
  });
  assert.deepEqual(restored.cables, cables);
  for (const [key, value] of Object.entries(rhythm.params))
    assert.equal(restored.modules[0].params[key], value);
  assert.equal(restored.modules[0].params.stepsB, 16);
  assert.equal(restored.modules[0].params.hitsB, 7);
  assert.equal(restored.modules[0].params.hitsC, 3);
});
