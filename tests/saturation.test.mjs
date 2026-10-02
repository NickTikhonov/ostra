import test from 'node:test';
import assert from 'node:assert/strict';
import { AUDIO_MODULES } from '../src/modules/audio.generated.js';
import { gentleTimeScale } from '../src/audio/dsp.js';
function setup(type, params = {}, sampleRate = 48000) {
  const { definition: d, processor: p } = AUDIO_MODULES[type];
  const c = {
    sampleRate,
    params: { ...Object.fromEntries(d.params.map((p) => [p.id, p.default])), ...params },
    inputs: Object.fromEntries(d.inputs.map((p) => [p.id, 0])),
    outputs: {},
    connected: {},
    outputConnected: {},
    state: p.createState(sampleRate, 'test'),
    data: {},
    stereo: { left: 0, right: 0 },
  };
  return {
    c,
    p,
    step(n = 1) {
      for (let j = 0; j < n; j++) p.process(c);
      return c.outputs;
    },
  };
}
function sine(t, amplitude = 5) {
  let dry = 0,
    wet = 0,
    mean = 0,
    thirdSin = 0,
    thirdCos = 0;
  const sr = t.c.sampleRate;
  for (let n = 0; n < sr * 2; n++) {
    const phase = (2 * Math.PI * 220 * n) / sr;
    const x = amplitude * Math.sin(phase);
    t.c.inputs.left = x;
    t.c.inputs.in = x;
    const o = t.step(),
      y = o.left ?? o.out;
    if (n >= sr) {
      dry += x * x;
      wet += y * y;
      mean += y;
      thirdSin += y * Math.sin(3 * phase);
      thirdCos += y * Math.cos(3 * phase);
    }
  }
  return {
    ratio: Math.sqrt(wet / dry),
    mean: mean / sr,
    third: (2 * Math.hypot(thirdSin, thirdCos)) / sr,
  };
}
test('GRIT starts at 10% wet and is much closer to dry level than the old default', () => {
  const current = setup('distortion'),
    old = setup('distortion', { mix: 0.85 });
  assert.equal(current.c.params.mix, 0.1);
  const newLevel = sine(current, 1).ratio,
    oldLevel = sine(old, 1).ratio;
  assert.ok(newLevel < 1.55, `new gain ${newLevel}`);
  assert.ok(newLevel < oldLevel * 0.5, `old gain ${oldLevel}, new gain ${newLevel}`);
});
for (const sr of [44100, 48000, 96000]) {
  test(`AMBER adds harmonics without a default gain jump at ${sr}Hz`, () => {
    for (const amplitude of [0.1, 1, 5]) {
      const result = sine(setup('saturator', {}, sr), amplitude);
      assert.ok(result.ratio > 0.8 && result.ratio <= 1.01, `${amplitude}V gain ${result.ratio}`);
      assert.ok(Math.abs(result.mean) < 0.001);
    }
    const driven = sine(setup('saturator', { drive: 6, mix: 1, warmth: 0 }, sr));
    assert.ok(driven.third > 0.1);
    assert.ok(driven.ratio < 1);
  });
}
test('AMBER supports mono normalisation, independent stereo, exact dry mix and silence', () => {
  const t = setup('saturator');
  for (let n = 0; n < 1000; n++) {
    t.c.inputs.left = Math.sin(n / 10) * 5;
    const o = t.step();
    assert.equal(o.left, o.right);
  }
  const stereo = setup('saturator');
  stereo.c.connected.right = true;
  stereo.c.inputs.left = 5;
  const o = stereo.step(100);
  assert.notEqual(o.left, 0);
  assert.equal(o.right, 0);
  const dry = setup('saturator', { mix: 0 });
  dry.c.connected.right = true;
  Object.assign(dry.c.inputs, { left: 2.75, right: -3.25 });
  assert.deepEqual(dry.step(), { left: 2.75, right: -3.25 });
  const quiet = setup('saturator', { drive: 6, warmth: 1, mix: 1 });
  assert.deepEqual(quiet.step(1000), { left: 0, right: 0 });
});
test('AMBER remains bounded under extreme inputs and parameter changes', () => {
  const t = setup('saturator', { drive: 6, warmth: 1, mix: 1, level: 1.5 });
  for (let n = 0; n < 20000; n++) {
    t.c.inputs.left = n % 2 ? 40 : -40;
    t.c.params.drive = n % 5 ? 6 : 1;
    t.c.params.warmth = n % 3 ? 1 : 0;
    for (const v of Object.values(t.step())) assert.ok(Number.isFinite(v) && Math.abs(v) < 30);
  }
});
test('time CV is proportional to the knob and clamps at ±10%, including extreme voltages', () => {
  for (const [cv, scale] of [
    [-100, 0.9],
    [-5, 0.9],
    [0, 1],
    [2.5, 1.05],
    [5, 1.1],
    [100, 1.1],
  ])
    assert.equal(gentleTimeScale(cv), scale);
  for (const type of ['delay', 'tape-delay'])
    for (const clocked of [false, true])
      for (const cv of [-100, 0, 100]) {
        const t = setup(type, { time: 0.4, division: 2 });
        t.c.inputs.time = cv;
        t.c.connected.clock = clocked;
        t.c.state.period = 0.4;
        t.c.state.seen = true;
        t.step(48000 * 2);
        const expected = 0.4 * gentleTimeScale(cv);
        assert.ok(
          Math.abs(t.c.state.delay / 48000 - expected) < 1e-6,
          `${type}: ${t.c.state.delay / 48000} != ${expected}`,
        );
      }
});
