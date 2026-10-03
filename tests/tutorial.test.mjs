import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { RackEngine } from '../src/audio/engine.js';
const dir = await mkdtemp(join(tmpdir(), 'ostra-tutorial-'));
after(() => rm(dir, { recursive: true, force: true }));
for (const name of ['modules', 'tutorial-demo', 'tutorial', 'patching']) {
  const source = await readFile(new URL(`../src/lib/${name}.ts`, import.meta.url), 'utf8');
  const js = ts
    .transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
    })
    .outputText.replaceAll("'./modules'", "'./modules.mjs'")
    .replaceAll("'./tutorial-demo'", "'./tutorial-demo.mjs'")
    .replace(
      "'../modules/definitions.generated.js'",
      JSON.stringify(new URL('../src/modules/definitions.generated.js', import.meta.url).href),
    );
  await writeFile(join(dir, `${name}.mjs`), js);
}
const {
  LESSONS,
  tutorialCheckpoint,
  prepareLesson,
  completeLesson,
  lessonComplete,
  lessonTargets,
  saveTutorial,
  restoreTutorial,
  TUTORIAL_KEY,
} = await import(pathToFileURL(join(dir, 'tutorial.mjs')));
const { validatePatch, DEFINITIONS, STORAGE_KEY, createModule } = await import(
  pathToFileURL(join(dir, 'modules.mjs'))
);
const rms = (a) => Math.sqrt(a.reduce((sum, n) => sum + n * n, 0) / a.length);
const { beginCable, finishCable } = await import(pathToFileURL(join(dir, 'patching.mjs')));
test('every lesson starts unfinished, has valid targets, and produces audible bounded audio when completed', () => {
  let p = tutorialCheckpoint(0);
  for (let step = 0; step < LESSONS.length; step++) {
    const before = structuredClone(p);
    p = prepareLesson(p, step);
    assert.deepEqual(p.cables, before.cables, `lesson ${step + 1} never prewires`);
    assert.equal(p.zoom, before.zoom, `lesson ${step + 1} preserves zoom`);
    for (const module of before.modules) {
      assert.deepEqual(
        p.modules.find((m) => m.id === module.id),
        module,
        `lesson ${step + 1} preserves existing module positions and controls`,
      );
    }
    assert.equal(lessonComplete(p, step), false, `lesson ${step + 1} starts incomplete`);
    for (const t of lessonTargets(step)) {
      const d = DEFINITIONS[t.module];
      assert.ok(
        'param' in t
          ? d.params.some((x) => x.id === t.param)
          : d[t.direction === 'in' ? 'inputs' : 'outputs'].some((x) => x.id === t.port),
      );
    }
    if (LESSONS[step].goal.kind === 'cable') {
      const [first, second] = lessonTargets(step).map((t) => ({
        ...t,
        module: `learn-${t.module}`,
      }));
      const next = finishCable(p, beginCable(p, first), second);
      assert.ok(next, `lesson ${step + 1} works by clicking its numbered jacks without modifiers`);
      assert.equal(lessonComplete(next, step), true);
      p = next;
    } else p = completeLesson(p, step);
    assert.equal(lessonComplete(p, step), true);
    assert.deepEqual(validatePatch(p), p);
    const engine = new RackEngine();
    engine.setPatch(p);
    const left = new Float32Array(48000 * 3),
      right = new Float32Array(left.length);
    engine.render(left, right);
    assert.ok(rms(left.subarray(48000)) > 0.002, `lesson ${step + 1} is audible`);
    assert.ok(
      left.every((x) => Number.isFinite(x) && Math.abs(x) < 0.5),
      `lesson ${step + 1} stays moderate`,
    );
  }
});
test('reset checkpoints reconstruct completed lessons without touching the source patch', () => {
  for (let step = 0; step < LESSONS.length; step++) {
    const p = tutorialCheckpoint(step),
      snapshot = structuredClone(p);
    completeLesson(p, step);
    assert.deepEqual(p, snapshot);
    assert.equal(lessonComplete(p, step), false);
  }
  assert.equal(lessonComplete(tutorialCheckpoint(LESSONS.length), LESSONS.length - 1), true);
});
test('repatch lesson requires removing the old CV destination, not merely adding another cable', () => {
  const step = LESSONS.findIndex((l) => l.title === 'Same movement, new destination');
  const p = tutorialCheckpoint(step),
    next = completeLesson(p, step);
  assert.ok(p.cables.some((c) => c.to === 'learn-vca' && c.toPort === 'cv'));
  assert.ok(!next.cables.some((c) => c.to === 'learn-vca' && c.toPort === 'cv'));
  next.cables.push(p.cables.find((c) => c.to === 'learn-vca' && c.toPort === 'cv'));
  assert.equal(lessonComplete(next, step), false);
});
test('tutorial progress persists separately from the normal rack, including free-play sample references', () => {
  const values = new Map([[STORAGE_KEY, 'my original rack']]);
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const p = completeLesson(tutorialCheckpoint(4), 4);
  saveTutorial(storage, p, 4);
  const restored = restoreTutorial(storage);
  assert.equal(restored.step, 4);
  assert.deepEqual(restored.patch, p);
  assert.equal(lessonComplete(restored.patch, 4), true);
  assert.equal(values.get(STORAGE_KEY), 'my original rack');
  const sampler = createModule('sampler');
  sampler.data.assetId = 'my-sample';
  p.modules.push(sampler);
  saveTutorial(storage, p, LESSONS.length);
  assert.deepEqual(
    restoreTutorial(storage, 390, 844).patch,
    p,
    'refresh and screen size preserve placement and zoom',
  );
  assert.equal(
    restoreTutorial(storage).patch.modules.find((m) => m.type === 'sampler').data.assetId,
    'my-sample',
  );
  values.set(TUTORIAL_KEY, '{broken');
  assert.equal(restoreTutorial(storage).step, -1);
  assert.equal(values.get(STORAGE_KEY), 'my original rack');
});
test('the microscope sees oscillator voltage before patching and the same voltage at the connected master', () => {
  const unpatched = tutorialCheckpoint(0);
  const source = new RackEngine();
  source.setPatch(unpatched);
  source.setProbe({ id: 'learn-oscillator', port: 'sine', direction: 'out', key: 'source' });
  const silentL = new Float32Array(4800),
    silentR = new Float32Array(4800);
  source.render(silentL, silentR);
  assert.ok(
    silentL.every((v) => v === 0),
    'observing does not connect the speakers',
  );
  assert.ok(
    Math.max(...source.getProbeFrame().fast.max) > 4,
    'unpatched oscillator still generates voltage',
  );
  const patch = completeLesson(unpatched, 0);
  const inspect = (id, port, direction) => {
    const engine = new RackEngine();
    engine.setPatch(patch);
    engine.setProbe({ id, port, direction, key: 'compare' });
    engine.render(new Float32Array(4800), new Float32Array(4800));
    return engine.getProbeFrame();
  };
  assert.deepEqual(
    inspect('learn-oscillator', 'sine', 'out').fast,
    inspect('learn-output', 'left', 'in').fast,
    'a cable delivers the source voltage unchanged',
  );
});
test('welcome patch plays an evolving, bounded stereo instrument with no external assets', () => {
  const patch = tutorialCheckpoint(-1, 1280, 800);
  assert.equal(patch.modules.length, 11);
  assert.equal(patch.cables.length, 26);
  assert.deepEqual(validatePatch(patch), patch);
  assert.ok(patch.modules.every((m) => !m.data.assetId));
  const engine = new RackEngine();
  engine.setPatch(patch);
  const pitches = new Set();
  let energy = 0,
    stereo = 0,
    peak = 0;
  for (let n = 0; n < 12; n++) {
    const left = new Float32Array(48000),
      right = new Float32Array(48000);
    engine.render(left, right);
    for (let i = 0; i < left.length; i++) {
      assert.ok(Number.isFinite(left[i]) && Number.isFinite(right[i]));
      peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
      energy += left[i] ** 2;
      stereo += (left[i] - right[i]) ** 2;
    }
    pitches.add(engine.byId.get('garden-scale').context.outputs.pitch);
  }
  const level = Math.sqrt(energy / (12 * 48000));
  assert.ok(peak < 0.7, `headroom: peak ${peak}`);
  assert.ok(level > 0.008 && level < 0.15, `audible, moderate RMS ${level}`);
  assert.ok(Math.sqrt(stereo / (12 * 48000)) > 0.005, 'independent stereo image');
  assert.ok(pitches.size >= 4, 'pitches evolve rather than repeating a fixed note');
});
test('new visitors see the intro, progress survives, and starting from scratch contains none of the demo', () => {
  const data = new Map([[STORAGE_KEY, 'personal rack']]);
  const storage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
  assert.equal(restoreTutorial(storage).step, -1);
  saveTutorial(storage, tutorialCheckpoint(-1), -1);
  assert.equal(restoreTutorial(storage).step, -1);
  const first = tutorialCheckpoint(0);
  assert.equal(first.modules.length, 1);
  assert.equal(first.cables.length, 0);
  assert.ok(!JSON.stringify(first).includes('garden-'));
  saveTutorial(storage, first, 0);
  assert.equal(restoreTutorial(storage).step, 0);
  assert.deepEqual(restoreTutorial(storage).patch, first);
  assert.equal(data.get(STORAGE_KEY), 'personal rack');
});
