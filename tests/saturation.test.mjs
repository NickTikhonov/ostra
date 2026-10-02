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
    fundamentalSin = 0,
    fundamentalCos = 0,
    secondSin = 0,
    secondCos = 0,
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
      fundamentalSin += y * Math.sin(phase);
      fundamentalCos += y * Math.cos(phase);
      secondSin += y * Math.sin(2 * phase);
      secondCos += y * Math.cos(2 * phase);
      thirdSin += y * Math.sin(3 * phase);
      thirdCos += y * Math.cos(3 * phase);
    }
  }
  return {
    ratio: Math.sqrt(wet / dry),
    mean: mean / sr,
    fundamental: (2 * Math.hypot(fundamentalSin, fundamentalCos)) / sr,
    second: (2 * Math.hypot(secondSin, secondCos)) / sr,
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
  const t = setup('saturator', { drive: 40, scorch: 1, warmth: 1, mix: 1, level: 1.5 });
  for (let n = 0; n < 20000; n++) {
    t.c.inputs.left = n % 2 ? 40 : -40;
    t.c.params.drive = n % 5 ? 40 : 1;
    t.c.params.scorch = n % 7 ? 1 : 0;
    t.c.params.warmth = n % 3 ? 1 : 0;
    for (const v of Object.values(t.step())) assert.ok(Number.isFinite(v) && Math.abs(v) < 30);
  }
});
for (const sr of [44100, 48000, 96000]) {
  test(`AMBER maximum drive gives strong harmonics even at half mix at ${sr}Hz`, () => {
    for (const amplitude of [1, 5]) {
      const mild = sine(setup('saturator', { drive: 1 }, sr), amplitude);
      const hot = sine(setup('saturator', { drive: 40 }, sr), amplitude);
      assert.ok(
        hot.third / hot.fundamental > 0.1,
        `max drive harmonic ratio ${hot.third / hot.fundamental}`,
      );
      assert.ok(hot.third > mild.third * 5);
      // The wet signal must not disappear below the dry signal as drive rises.
      assert.ok(hot.ratio > 0.7);
      assert.ok(Math.abs(hot.mean) < 0.005);
    }
  });
}
test('AMBER warmth adds even harmonics; SCORCH adds 20dB and the meter follows drive, not output', () => {
  const neutral = sine(setup('saturator', { drive: 6, warmth: 0, mix: 1 }));
  const warm = sine(setup('saturator', { drive: 6, warmth: 1, mix: 1 }));
  assert.ok(warm.second > neutral.second + 0.1);
  const low = setup('saturator', { drive: 2, warmth: 0, mix: 1 });
  const high = setup('saturator', { drive: 2, scorch: 1, warmth: 0, mix: 1, level: 0.2 });
  const a = sine(low, 1),
    b = sine(high, 1);
  assert.ok(b.third / b.fundamental > (a.third / a.fundamental) * 5);
  const read = (t) => t.p.getDisplayState(t.c.state).driveDb;
  assert.ok(Math.abs(read(high) - read(low) - 20) < 0.01);
  const before = read(high);
  high.c.inputs.left = 0;
  high.step(48000 * 3);
  assert.ok(read(high) < before - 35);
  assert.ok(Number.isFinite(read(setup('saturator'))));
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
