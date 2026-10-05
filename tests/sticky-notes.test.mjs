import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { loadLib } from './helpers/load-lib.mjs';
const libs = await loadLib(['sticky-notes', 'modules', 'tutorial-demo']);
after(libs.close);
const { noteOverlaps } = await libs.load('sticky-notes');
const { tutorialDemo, resizeTutorialDemo } = await libs.load('tutorial-demo');

test('free-positioned notes yield to any module they cover, including rotated corners', () => {
  const note = { x: 120, y: 70, width: 210, height: 140, rotation: -5 };
  assert.equal(noteOverlaps(note, { x: 42, y: 42, width: 180, height: 380 }), true);
  assert.equal(noteOverlaps(note, { x: 230, y: 42, width: 320, height: 380 }), true);
  assert.equal(
    noteOverlaps(note, { x: 333, y: 80, width: 50, height: 80 }),
    true,
    'tilted edge can cover the next panel',
  );
  assert.equal(
    noteOverlaps({ ...note, scale: 0.6 }, { x: 333, y: 80, width: 50, height: 80 }),
    false,
    'shrinking the paper also shrinks its occlusion region',
  );
  assert.equal(noteOverlaps(note, { x: 42, y: 472, width: 320, height: 380 }), false);
});

test('phone demo keeps notes and controls readable without losing patch edits on resize', () => {
  const patch = tutorialDemo(390, 844);
  assert.equal(patch.zoom, 0.65);
  patch.modules.find((m) => m.id === 'garden-bell').params.decay = 4.2;
  const wide = resizeTutorialDemo(patch, 1440, 900);
  const narrow = resizeTutorialDemo(wide, 320, 740);
  assert.equal(narrow.modules.find((m) => m.id === 'garden-bell').params.decay, 4.2);
  assert.deepEqual(narrow.cables, patch.cables);
  assert.equal(narrow.zoom, 0.65);
});
