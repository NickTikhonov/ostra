import test from 'node:test';
import assert from 'node:assert/strict';
import { AUDIO_MODULES } from '../src/modules/audio.generated.js';
import { createData, restoreData, resizeData } from '../src/modules/sequencer/data.js';

function setup(type, params = {}, sampleRate = 48000) {
  const { definition, processor } = AUDIO_MODULES[type];
  const context = {
    sampleRate,
    params: { ...Object.fromEntries(definition.params.map((p) => [p.id, p.default])), ...params },
    inputs: Object.fromEntries(definition.inputs.map((p) => [p.id, 0])),
    outputs: {},
    connected: {},
    outputConnected: {},
    stereo: { left: 0, right: 0 },
    state: processor.createState(sampleRate, 'test'),
    data: definition.createData?.() ?? {},
  };
  return {
    c: context,
    p: processor,
    step(seconds = 1 / sampleRate) {
      for (let n = 0; n < Math.round(seconds * sampleRate); n++) processor.process(context);
      return context.outputs;
    },
  };
}
const near = (a, b, tolerance = 0.01) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);

test('PATH defaults to ±10V without rescaling a saved sequence or its editing range', () => {
  assert.equal(createData().rangeMin, -10);
  assert.equal(createData().rangeMax, 10);
  const saved = { ...createData(), rangeMin: 0, rangeMax: 5, steps: [-9, 8, 0, 1, 2, 3, 4, 5] };
  assert.deepEqual(restoreData({ version: 3, data: saved }), saved);
});

test('BLOOM independently voltage-controls attack, decay, sustain and release', () => {
  const t = setup('envelope', { attack: 0.1, decay: 0.1, sustain: 0.5, release: 0.1 });
  t.c.inputs.gate = 5;
  t.c.inputs.attack = 5;
  near(t.step(0.055).env, 2.5); // +5V adds 10%: 110ms attack.
  near(t.step(0.055).env, 5);
  t.c.inputs.decay = 5;
  near(t.step(0.055).env, 3.75); // Half way through 110ms decay.
  near(t.step(0.06).env, 2.5);
  t.c.inputs.sustain = 2.5;
  near(t.step().env, 5);
  t.c.inputs.sustain = -2.5;
  near(t.step().env, 0);
  t.c.inputs.sustain = 0;
  t.step();
  t.c.inputs.release = 5;
  t.c.inputs.gate = 0;
  near(t.step(0.0275).env, 1.25);
  const ended = t.step(0.029);
  near(ended.env, 0);
  assert.equal(ended.end, 5);
  near(ended.inv, 0);
});

test('BLOOM remains finite and bounded with extreme CV at all envelope stages', () => {
  const t = setup('envelope');
  for (const cv of [-100, 100]) {
    Object.assign(t.c.inputs, { attack: cv, decay: cv, sustain: cv, release: cv, gate: 5 });
    for (let stage = 1; stage <= 4; stage++) {
      t.c.state.stage = stage;
      t.c.state.value = 0.5;
      const o = t.step(0.02);
      assert.ok(Number.isFinite(o.env) && o.env >= 0 && o.env <= 5);
      assert.equal(o.inv, -o.env);
    }
  }
});

test('VEIL channels independently amplify bipolar CV/audio and keep original channel A response', () => {
  const t = setup('vca', { gain: 0.2, depth: 0.8, curve: 0.35, gain2: 0, depth2: 1, curve2: 0 });
  Object.assign(t.c.inputs, { in: -4, cv: 2.5, in2: 3, cv2: 5 });
  const linear = 0.6,
    expected = -4 * (linear + (Math.expm1(linear * 4) / Math.expm1(4) - linear) * 0.35);
  near(t.step().out, expected, 1e-9);
  near(t.c.outputs.out2, 3);
  t.c.inputs.cv2 = -5;
  near(t.step().out2, 0);
  near(t.c.outputs.out, expected, 1e-9);
  t.c.inputs.cv = -100;
  t.c.inputs.cv2 = 100;
  near(t.step().out, 0);
  near(t.c.outputs.out2, 3);
});

for (const sampleRate of [44100, 48000, 96000]) {
  test(`SPROUT runs independent AD cycles, held triggers, EOC and retrigger at ${sampleRate}Hz`, () => {
    const t = setup(
      'dual-envelope',
      { attack1: 0.01, decay1: 0.1, attack2: 0.1, decay2: 0.2 },
      sampleRate,
    );
    t.c.inputs.trigger1 = 5;
    t.c.inputs.trigger2 = 5;
    let o = t.step(0.01);
    near(o.env1, 5);
    near(o.env2, 0.5);
    o = t.step(0.05);
    near(o.env1, 2.5);
    near(o.env2, 3);
    t.c.inputs.trigger1 = 0;
    t.step();
    t.c.inputs.trigger1 = 5;
    const previous = t.c.outputs.env1;
    assert.ok(t.step().env1 > previous);
    assert.ok(t.c.outputs.env1 - previous < 0.02);
    o = t.step(0.111);
    near(o.env1, 0);
    assert.equal(o.end1, 5);
    t.step(0.02);
    assert.equal(t.c.outputs.end1, 0);
    t.step(0.3);
    near(t.c.outputs.env1, 0);
    near(t.c.outputs.env2, 0); // A held gate never restarts.
    t.p.onEvent(t.c, 'trigger2');
    t.step(0.05);
    near(t.c.outputs.env2, 2.5);
    near(t.c.outputs.env1, 0);
  });
}

test('PATH grows to eight pages, retains shortened phrases, and bounds corrupt saves', () => {
  const original = createData(),
    expanded = resizeData(original, 64);
  assert.equal(expanded.steps.length, 64);
  assert.deepEqual(expanded.steps.slice(0, 8), original.steps);
  expanded.steps[63] = 1.25;
  assert.deepEqual(resizeData(expanded, 8), expanded);
  assert.deepEqual(restoreData({ version: 4, params: { length: 64 }, data: expanded }), expanded);
  const corrupt = restoreData({
    version: 4,
    params: { length: 1000000 },
    data: { steps: [NaN, Infinity] },
  });
  assert.equal(corrupt.steps.length, 64);
  assert.ok(corrupt.steps.every(Number.isFinite));
  assert.equal(
    createData().steps.length,
    8,
    'new and tutorial modules still begin with eight stages',
  );
});

for (const length of [13, 64]) {
  test(`PATH visits all ${length} stages and wraps without truncating to eight`, () => {
    const t = setup('sequencer', { length }, 1000);
    t.c.data = resizeData(createData(), length);
    t.c.data.steps = t.c.data.steps.map((_, i) => i / 12);
    t.c.connected.clock = true;
    for (let tick = 0; tick <= length; tick++) {
      t.c.inputs.clock = 0;
      t.step(0.019);
      t.c.inputs.clock = 5;
      const out = t.step();
      assert.equal(t.c.state.step, tick % length);
      near(out.pitch, (tick % length) / 12, 1e-9);
    }
  });
}

test('PATH ties sustain a gate through clock jitter, then release for a rest', () => {
  const t = setup('sequencer', {}, 1000);
  t.c.connected.clock = true;
  t.c.data.gateLengths.fill(1);
  t.c.data.gates[2] = false;
  t.c.inputs.clock = 5;
  assert.equal(t.step().gate, 5);
  t.c.inputs.clock = 0;
  t.step(0.099);
  t.c.inputs.clock = 5;
  assert.equal(t.step().gate, 5);
  t.c.inputs.clock = 0;
  for (let n = 0; n < 103; n++) assert.equal(t.step().gate, 5);
  t.c.inputs.clock = 5;
  assert.equal(t.step().gate, 0);
});
