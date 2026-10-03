import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { loadLib } from './helpers/load-lib.mjs';

const libs = await loadLib(['cable-motion']);
after(libs.close);
const { cableCurve, cableSlack, CABLE_SETTLE_MS, HELD_CABLE_SLACK } =
  await libs.load('cable-motion');

test('a released cable drops, rebounds gently, and comes to rest', () => {
  assert.ok(Math.abs(cableSlack(0) - HELD_CABLE_SLACK) < 1e-10);
  const samples = Array.from({ length: 121 }, (_, i) => cableSlack(i * 10));
  assert.ok(samples[10] > samples[0], 'gravity initially pulls the slack downward');
  assert.ok(Math.max(...samples) > 1.05, 'the first drop passes its resting position');
  assert.ok(Math.max(...samples) < 1.2, 'rebound stays subtle');
  assert.ok(Math.min(...samples) > 0, 'the cable never bows upward');
  assert.ok(Math.abs(cableSlack(CABLE_SETTLE_MS - 1) - 1) < 0.001);
  assert.equal(cableSlack(CABLE_SETTLE_MS), 1);
  assert.equal(cableSlack(60_000), 1, 'returning to a background tab is already settled');
});

test('settling changes slack without shifting either plug, at any cable span', () => {
  for (const [a, b] of [
    [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ],
    [
      { x: 300, y: 40 },
      { x: 300, y: 800 },
    ],
    [
      { x: 20, y: 500 },
      { x: 2200, y: 40 },
    ],
    [
      { x: 800, y: 350 },
      { x: -200, y: 350 },
    ],
  ]) {
    for (const elapsed of [0, 16, 100, 300, 600, CABLE_SETTLE_MS]) {
      const path = cableCurve(a, b, cableSlack(elapsed));
      assert.ok(path.startsWith(`M${a.x},${a.y} C${a.x},`));
      assert.ok(path.endsWith(` ${b.x},${b.y}`));
      assert.ok(!/NaN|Infinity/.test(path));
    }
    assert.equal(cableCurve(a, b, cableSlack(CABLE_SETTLE_MS)), cableCurve(a, b));
  }
});
