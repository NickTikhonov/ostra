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
for (const name of ['modules', 'tutorial-demo', 'tutorial', 'tutorial-scope', 'patching']) {
  const source = await readFile(new URL(`../src/lib/${name}.ts`, import.meta.url), 'utf8');
  const js = ts
    .transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
    })
    .outputText.replaceAll("'./modules'", "'./modules.mjs'")
    .replaceAll("'./tutorial-demo'", "'./tutorial-demo.mjs'")
    .replaceAll("'./tutorial'", "'./tutorial.mjs'")
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
  completeLessonAction,
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
    for (const t of lessonTargets(step, p)) {
      const d = DEFINITIONS[t.module];
      assert.ok(
        'param' in t
          ? d.params.some((x) => x.id === t.param)
          : d[t.direction === 'in' ? 'inputs' : 'outputs'].some((x) => x.id === t.port),
      );
    }
    if (LESSONS[step].goal.kind === 'cable') {
      let connections = 0;
      while (!lessonComplete(p, step)) {
        assert.ok(connections++ < 3, 'bounded number of connections');
        const [first, second] = lessonTargets(step, p).map((t) => ({
          ...t,
          module: `learn-${t.module}`,
        }));
        const next = finishCable(p, beginCable(p, first), second);
        assert.ok(
          next,
          `lesson ${step + 1} works by clicking its numbered jacks without modifiers`,
        );
        p = next;
      }
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
test('pitch lesson accepts exploring either direction without a target note or rewiring', () => {
  const patch = tutorialCheckpoint(1);
  assert.equal(lessonComplete(patch, 1), false);
  const cables = structuredClone(patch.cables);
  for (const tune of [-13, -11, 0, 12]) {
    patch.modules.find((m) => m.type === 'oscillator').params.tune = tune;
    assert.equal(lessonComplete(patch, 1), true);
    assert.deepEqual(patch.cables, cables);
  }
  assert.equal(lessonComplete(tutorialCheckpoint(1), 1), false, 'reset restores the exercise');
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
  assert.equal(patch.modules.length, 12);
  assert.equal(patch.cables.length, 28);
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
  const adjusted = tutorialCheckpoint(-1);
  adjusted.modules.find((m) => m.id === 'garden-warmth').params.drive = 2.1;
  saveTutorial(storage, adjusted, -1);
  const resized = restoreTutorial(storage, 390, 844).patch;
  assert.equal(resized.modules.find((m) => m.id === 'garden-warmth').params.drive, 2.1);
  const first = tutorialCheckpoint(0);
  assert.equal(first.modules.length, 1);
  assert.equal(first.cables.length, 0);
  assert.ok(!JSON.stringify(first).includes('garden-'));
  saveTutorial(storage, first, 0);
  assert.equal(restoreTutorial(storage).step, 0);
  assert.deepEqual(restoreTutorial(storage).patch, first);
  assert.equal(data.get(STORAGE_KEY), 'personal rack');
});

test('filter wiring advances its target automatically and survives refresh halfway through', () => {
  const start = tutorialCheckpoint(3);
  const first = completeLessonAction(start, 3);
  assert.equal(lessonComplete(first, 3), false);
  assert.ok(first.cables.some((c) => c.from === 'learn-oscillator' && c.to === 'learn-output'));
  assert.deepEqual(first.modules, start.modules, 'no module or knob moves');
  assert.deepEqual(lessonTargets(3, first), [
    { module: 'filter', port: 'low', direction: 'out' },
    { module: 'output', port: 'left', direction: 'in' },
  ]);
  let saved;
  const storage = {
    setItem: (_, value) => {
      saved = value;
    },
    getItem: () => saved,
  };
  saveTutorial(storage, first, 3);
  assert.deepEqual(restoreTutorial(storage).patch, first);
  assert.deepEqual(lessonTargets(3, restoreTutorial(storage).patch), lessonTargets(3, first));
  const finished = completeLessonAction(first, 3);
  assert.equal(lessonComplete(finished, 3), true);
  assert.ok(!finished.cables.some((c) => c.from === 'learn-oscillator' && c.to === 'learn-output'));
  assert.equal(LESSONS[4].goal.param, 'cutoff', 'cutoff is immediately next');
  const old = { ...first, tutorialStep: 4, tutorialLesson: 'Listen through the filter' };
  saved = JSON.stringify(old);
  assert.equal(restoreTutorial(storage).step, 3, 'old second wiring step resumes combined lesson');
  saved = JSON.stringify({ ...finished, tutorialStep: 19, tutorialLesson: 'complete' });
  assert.equal(
    restoreTutorial(storage).step,
    LESSONS.length,
    'completed old tutorial stays complete',
  );
});

test('master waveform follows output selection and becomes smoother as cutoff falls', () => {
  const read = (patch) => {
    const engine = new RackEngine();
    engine.setPatch(patch);
    engine.setProbe({ id: 'learn-output', port: 'left', direction: 'in', key: 'heard' });
    engine.render(new Float32Array(24000), new Float32Array(24000));
    const frame = engine.getProbeFrame().fast;
    return frame.min.map((v, i) => (v + frame.max[i]) / 2);
  };
  const sine = read(tutorialCheckpoint(2));
  const sawPatch = completeLesson(tutorialCheckpoint(2), 2);
  const saw = read(sawPatch);
  const filteredPatch = completeLesson(tutorialCheckpoint(3), 3);
  filteredPatch.modules.find((m) => m.type === 'filter').params.cutoff = 700;
  const filtered = read(filteredPatch);
  const roughness = (a) =>
    a.slice(2).reduce((sum, v, i) => sum + (v - 2 * a[i + 1] + a[i]) ** 2, 0) /
    a.reduce((sum, v) => sum + v * v, 0);
  assert.ok(roughness(saw) > roughness(sine) * 3, 'saw has sharper edges than sine');
  assert.ok(roughness(filtered) < roughness(saw) * 0.5, 'low cutoff rounds the saw edges');
});

test('PATH makes a pitch pattern before BLOOM appears, preserving the learner’s sequence', () => {
  const pitchStep = LESSONS.findIndex((lesson) => lesson.title === 'Meet the Sequencer');
  const envelopeStep = LESSONS.findIndex(
    (lesson) => lesson.title === 'Meet the Envelope Generator',
  );
  assert.equal(envelopeStep, pitchStep + 1);
  assert.ok(LESSONS.every((lesson) => (lesson.introduce?.length ?? 0) <= 1));
  const start = tutorialCheckpoint(pitchStep);
  assert.ok(start.modules.some((m) => m.type === 'sequencer'));
  assert.ok(!start.modules.some((m) => m.type === 'envelope'));
  assert.equal(LESSONS[pitchStep].goal.then, undefined, 'one connection produces a result');
  const melody = completeLessonAction(start, pitchStep);
  assert.equal(lessonComplete(melody, pitchStep), true);
  const sequencer = melody.modules.find((m) => m.type === 'sequencer');
  sequencer.params.tempo = 120;
  sequencer.data.steps[2] = 0.5;
  sequencer.x += 100;
  const withEnvelope = prepareLesson(melody, envelopeStep);
  assert.deepEqual(withEnvelope.cables, melody.cables, 'BLOOM arrives unpatched');
  assert.deepEqual(
    withEnvelope.modules.filter((m) => m.type !== 'envelope'),
    melody.modules,
  );
  assert.ok(withEnvelope.modules.some((m) => m.type === 'envelope'));
  assert.equal(lessonComplete(withEnvelope, envelopeStep), false);
});

test('older envelope progress resumes missing pitch wiring without changing the rack', () => {
  const pitchStep = LESSONS.findIndex((lesson) => lesson.title === 'Meet the Sequencer');
  const envelopeStep = LESSONS.findIndex(
    (lesson) => lesson.title === 'Meet the Envelope Generator',
  );
  const patch = completeLessonAction(tutorialCheckpoint(envelopeStep), envelopeStep);
  patch.cables = patch.cables.filter((c) => !(c.to === 'learn-oscillator' && c.toPort === 'pitch'));
  for (const title of [
    'Give each note a beginning and end',
    'Give the envelope a clock',
    'Meet PATH and BLOOM',
    'Let the notes fall silent',
    'Soften the attack',
    'Turn voltage into a melody',
    'Meet PATH',
  ]) {
    const storage = {
      getItem: () => JSON.stringify({ ...patch, tutorialStep: 9, tutorialLesson: title }),
    };
    assert.deepEqual(restoreTutorial(storage), { patch, step: pitchStep }, title);
  }
});

test('envelope and reverb connections advance within one lesson and retain progress on refresh', () => {
  for (const [title, oldTitle] of [
    ['Meet the Envelope Generator', 'Give each note a beginning and end'],
    ['Meet the Envelope Generator', 'Give the envelope a clock'],
    ['Meet the Envelope Generator', 'Meet PATH and BLOOM'],
    ['Meet the Envelope Generator', 'Meet BLOOM'],
    ['Put your instrument in a room', 'Hear the room'],
  ]) {
    const step = LESSONS.findIndex((lesson) => lesson.title === title);
    const start = tutorialCheckpoint(step);
    const first = completeLessonAction(start, step);
    assert.equal(lessonComplete(first, step), false);
    assert.deepEqual(first.modules, start.modules, 'connections never move modules or knobs');
    assert.deepEqual(
      first.cables.filter((c) => c.to === 'learn-output'),
      start.cables.filter((c) => c.to === 'learn-output'),
      'the first connection keeps the existing audible route',
    );
    assert.notDeepEqual(lessonTargets(step, first), lessonTargets(step, start));
    let saved;
    const storage = {
      getItem: () => saved,
      setItem: (_, value) => {
        saved = value;
      },
    };
    saveTutorial(storage, first, step);
    assert.deepEqual(restoreTutorial(storage), { patch: first, step });
    saved = JSON.stringify({ ...first, tutorialStep: step + 1, tutorialLesson: oldTitle });
    assert.deepEqual(
      restoreTutorial(storage),
      { patch: first, step },
      'merged older lessons retain the rack',
    );
    const second = completeLessonAction(restoreTutorial(storage).patch, step);
    assert.equal(lessonComplete(second, step), true);
    assert.deepEqual(second, completeLesson(start, step));
  }
});

test('lesson displays select actual audio or control signals without learner configuration', async () => {
  const { lessonScope, lessonSignal } = await import(
    pathToFileURL(join(dir, 'tutorial-scope.mjs'))
  );
  assert.equal(lessonScope(0), null);
  assert.equal(lessonSignal(1), null);
  assert.equal(lessonScope(LESSONS.length), null);
  for (const [title, id, port] of [
    ['Meet the Envelope Generator', 'learn-envelope', 'env'],
    ['Meet the Sequencer', 'learn-sequencer', 'pitch'],
  ]) {
    const step = LESSONS.findIndex((lesson) => lesson.title === title);
    const patch = completeLesson(tutorialCheckpoint(step), step);
    assert.equal(lessonScope(step).time, 'slow');
    assert.equal(lessonScope(step).unipolar, true);
    const probe = lessonSignal(step, patch);
    assert.equal(probe.id, id);
    assert.equal(probe.port, port);
    assert.equal(probe.direction, 'out');
    const engine = new RackEngine();
    engine.setPatch(patch);
    engine.setProbe(probe);
    engine.render(new Float32Array(48000 * 5), new Float32Array(48000 * 5));
    const frame = engine.getProbeFrame();
    assert.equal(frame.key, probe.key);
    assert.ok(
      Math.max(...frame.slow.max) - Math.min(...frame.slow.min) > 0.1,
      'displayed voltage changes over time',
    );
  }
  const patch = tutorialCheckpoint(2);
  const before = lessonSignal(2, patch);
  const after = lessonSignal(2, completeLesson(patch, 2));
  assert.equal(before.id, 'learn-output');
  assert.equal(before.direction, 'in');
  assert.notEqual(before.key, after.key, 'repatching clears the previous waveform');
  assert.equal(lessonScope(2).time, 'fast');
});
