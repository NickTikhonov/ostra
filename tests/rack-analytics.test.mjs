import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { loadLib } from './helpers/load-lib.mjs';

const libs = await loadLib(['modules', 'tutorial-demo', 'tutorial', 'rack-analytics', 'patching']);
after(libs.close);
const { createRackAnalytics } = await libs.load('rack-analytics');
const { createModule, DEFINITIONS } = await libs.load('modules');
const { beginCable, finishCable } = await libs.load('patching');
const { LESSONS, tutorialCheckpoint, prepareLesson, completeLessonAction, lessonComplete } =
  await libs.load('tutorial');
const recorder = () => {
  const events = [];
  const analytics = createRackAnalytics((name, properties) => events.push({ name, properties }));
  return { events, analytics };
};

test('module additions report the display name and distinguish playground from tutorial', () => {
  const { events, analytics } = recorder();
  const before = tutorialCheckpoint(0);
  const added = { ...before, modules: [...before.modules, createModule('sequencer')] };
  analytics.edit(before, added, { tutorial: false });
  assert.deepEqual(events, [
    {
      name: 'module_added',
      properties: { context: 'playground', module_name: 'PATH', module_type: 'sequencer' },
    },
  ]);
  const step = LESSONS.findIndex((l) => l.title === 'Meet the Sequencer');
  const start = tutorialCheckpoint(step - 1);
  const next = prepareLesson(start, step);
  analytics.introduce(start, next, step);
  assert.deepEqual(events[1], {
    name: 'module_added',
    properties: {
      context: 'tutorial',
      tutorial_id: 'onboarding',
      module_name: 'PATH',
      module_type: 'sequencer',
    },
  });
  analytics.introduce(next, prepareLesson(next, step), step);
  assert.equal(events.length, 2, 'revisiting an existing module does not count again');
});

test('successful patching and repatching report both modules, including the master', () => {
  const { events, analytics } = recorder();
  const start = tutorialCheckpoint(0);
  const source = { module: start.modules[0].id, port: 'sine', direction: 'out' };
  const left = { module: start.output.id, port: 'left', direction: 'in' };
  const connected = finishCable(start, beginCable(start, source), left);
  analytics.edit(start, connected, { tutorial: false });
  const repatched = finishCable(connected, beginCable(connected, left), { ...left, port: 'right' });
  analytics.edit(connected, repatched, { tutorial: false });
  assert.equal(connected.cables[0].id, repatched.cables[0].id);
  assert.equal(events.length, 2);
  for (const event of events) {
    assert.equal(event.name, 'cable_patched');
    assert.deepEqual(event.properties, {
      context: 'playground',
      from_module: 'ORBIT',
      to_module: 'MASTER',
      from_module_type: 'oscillator',
      to_module_type: 'output',
      method: 'manual',
    });
  }
  analytics.edit(repatched, { ...repatched, zoom: 0.8 }, { tutorial: false });
  analytics.edit(repatched, { ...repatched, cables: [] }, { tutorial: false });
  assert.equal(events.length, 2, 'zooming and removing cables are not patch events');
});

test('each lesson emits completion at its actual goal, including multi-cable demos', () => {
  const { events, analytics } = recorder();
  for (let step = 0; step < LESSONS.length; step++) {
    let patch = tutorialCheckpoint(step);
    let actions = 0;
    while (!lessonComplete(patch, step)) {
      assert.ok(actions++ < 3);
      const next = completeLessonAction(patch, step);
      analytics.edit(patch, next, { tutorial: true, step }, 'demo');
      const completions = events.filter((e) => e.name === 'tutorial_step_completed');
      assert.equal(completions.length, step + Number(lessonComplete(next, step)));
      patch = next;
    }
  }
  const completions = events.filter((e) => e.name === 'tutorial_step_completed');
  assert.deepEqual(
    completions.map((e) => e.properties),
    LESSONS.map((lesson, step) => ({
      tutorial_id: 'onboarding',
      step_index: step,
      step_title: lesson.title,
      method: 'demo',
    })),
  );
  for (const event of events.filter((e) => e.name === 'cable_patched')) {
    assert.equal(event.properties.context, 'tutorial');
    assert.equal(event.properties.tutorial_id, 'onboarding');
    assert.equal(event.properties.method, 'demo');
    assert.ok(Object.values(DEFINITIONS).some((d) => d.name === event.properties.from_module));
  }
});

test('restores, retries, and resets do not inflate the completion funnel', () => {
  const { events, analytics } = recorder();
  const before = tutorialCheckpoint(1);
  const afterPatch = completeLessonAction(before, 1);
  analytics.resume(before, 1);
  assert.equal(events.length, 0);
  analytics.edit(before, afterPatch, { tutorial: true, step: 1 });
  analytics.edit(afterPatch, afterPatch, { tutorial: true, step: 1 });
  analytics.edit(before, afterPatch, { tutorial: true, step: 1 });
  assert.equal(events.length, 1, 'only one completion during knob changes or retry');
  const resumed = recorder();
  resumed.analytics.resume(afterPatch, 1);
  resumed.analytics.edit(before, afterPatch, { tutorial: true, step: 1 });
  resumed.analytics.introduce(afterPatch, tutorialCheckpoint(1), 1);
  assert.equal(resumed.events.length, 0, 'refresh and checkpoint reconstruction emit nothing');
  analytics.restart();
  analytics.edit(before, afterPatch, { tutorial: true, step: 1 });
  assert.equal(events.length, 2, 'starting the tutorial again opens a fresh funnel');
});

test('initial tutorial module is tracked without counting the reconstructed demo or cables', () => {
  const { events, analytics } = recorder();
  analytics.introduce(tutorialCheckpoint(-1), tutorialCheckpoint(0), 0);
  assert.deepEqual(
    events.map((e) => [e.name, e.properties.module_name]),
    [['module_added', 'ORBIT']],
  );
  analytics.introduce(tutorialCheckpoint(0), tutorialCheckpoint(-1), -1);
  assert.equal(events.length, 1);
});

test('unavailable analytics never interrupts a successful edit', () => {
  const analytics = createRackAnalytics(() => {
    throw new Error('blocked');
  });
  const before = tutorialCheckpoint(0);
  assert.doesNotThrow(() =>
    analytics.edit(before, completeLessonAction(before, 0), { tutorial: true, step: 0 }),
  );
});
