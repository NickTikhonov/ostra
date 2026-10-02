import test from 'node:test';
import assert from 'node:assert/strict';
import { AUDIO_MODULES } from '../src/modules/audio.generated.js';
import { isHit } from '../src/modules/euclidean/pattern.js';
import { RackEngine } from '../src/audio/engine.js';
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
      return { ...c.outputs };
    },
    pulse(port = 'clock') {
      c.inputs[port] = 0;
      p.process(c);
      c.inputs[port] = 5;
      p.process(c);
      return { ...c.outputs };
    },
  };
}
const rms = (a) => Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length);
function renderVoice(t, seconds = 0.5) {
  const out = new Float32Array(Math.round(seconds * t.c.sampleRate));
  for (let n = 0; n < out.length; n++) out[n] = t.step().out;
  return out;
}

test('Euclidean patterns contain the requested hits, balanced gaps, and exact rotations for every length', () => {
  for (let steps = 1; steps <= 32; steps++)
    for (let hits = 0; hits <= steps; hits++) {
      const positions = Array.from({ length: steps }, (_, i) => i).filter((i) =>
        isHit(i, steps, hits, 0),
      );
      assert.equal(positions.length, hits);
      if (hits > 0) {
        const gaps = positions.map(
          (x, n) => (positions[(n + 1) % hits] - x + steps) % steps || steps,
        );
        assert.ok(Math.max(...gaps) - Math.min(...gaps) <= 1);
      }
      for (let rotation = 0; rotation < steps; rotation++)
        for (let step = 0; step < steps; step++)
          assert.equal(
            isHit(step, steps, hits, rotation),
            isHit((step - rotation + steps) % steps, steps, hits, 0),
          );
    }
});
test('PULSE clocks externally, resets to step one, emits complementary rests and separates consecutive triggers', () => {
  const t = setup('euclidean', { steps: 8, hits: 3 });
  t.c.connected.clock = true;
  assert.equal(t.step(100).hit, 0);
  let hits = 0,
    rests = 0,
    cycles = 0;
  for (let n = 0; n < 16; n++) {
    const o = t.pulse();
    hits += o.hit > 0;
    rests += o.rest > 0;
    cycles += o.cycle > 0;
    assert.equal(t.c.state.tracks[0].step, n % 8);
    t.c.inputs.clock = 0;
    t.step(600);
    assert.equal(t.c.outputs.hit, 0);
  }
  assert.equal(hits, 6);
  assert.equal(rests, 10);
  assert.equal(cycles, 2);
  t.c.inputs.reset = 5;
  t.c.inputs.clock = 0;
  t.step();
  assert.equal(t.c.state.tracks[0].step, -1);
  assert.equal(t.pulse().hit, 5);
  assert.equal(t.c.state.tracks[0].step, 0);
  t.c.params.hits = 8;
  t.c.params.chance = 0;
  for (let n = 0; n < 8; n++) {
    const o = t.pulse();
    assert.equal(o.hit, 0);
    assert.equal(o.rest, 0);
  }
});
test('PULSE advances three independent lengths on one clock and resets all tracks together', () => {
  const t = setup('euclidean', {
    steps: 8,
    hits: 3,
    rotate: 1,
    stepsB: 5,
    hitsB: 2,
    rotateB: 2,
    stepsC: 7,
    hitsC: 4,
    rotateC: 3,
  });
  t.c.connected.clock = true;
  for (let n = 0; n < 280; n++) {
    const o = t.pulse();
    for (const [index, length, hits, rotate, port] of [
      [0, 8, 3, 1, 'hit'],
      [1, 5, 2, 2, 'hitB'],
      [2, 7, 4, 3, 'hitC'],
    ]) {
      assert.equal(t.c.state.tracks[index].step, n % length);
      assert.equal(o[port], isHit(n % length, length, hits, rotate) ? 5 : 0);
    }
    t.c.inputs.clock = 0;
    t.step(600);
    assert.equal(t.c.outputs.hitB, 0);
    assert.equal(t.c.outputs.hitC, 0);
  }
  t.p.onEvent(t.c, 'reset');
  t.step();
  assert.deepEqual(
    t.c.state.tracks.map((t) => t.step),
    [-1, -1, -1],
  );
  t.c.inputs.reset = 5;
  t.c.inputs.clock = 5;
  t.step();
  assert.deepEqual(
    t.c.state.tracks.map((t) => t.step),
    [0, 0, 0],
  );
  const display = t.p.getDisplayState(t.c.state);
  assert.deepEqual([display.step, display.stepB, display.stepC], [0, 0, 0]);
});
test('PULSE edits and probability in one track do not change the other tracks', () => {
  const a = setup('euclidean', { hitsB: 16, chanceB: 0.5, chanceC: 0 });
  const b = setup('euclidean', { hitsB: 16, chanceB: 0.5, chanceC: 0 });
  a.c.connected.clock = b.c.connected.clock = true;
  let bHits = 0;
  for (let n = 0; n < 100; n++) {
    a.c.params.steps = (n % 32) + 1;
    a.c.params.hits = n % 9;
    a.c.params.chance = 0.3;
    const ao = a.pulse(),
      bo = b.pulse();
    assert.equal(ao.hitB, bo.hitB);
    assert.equal(ao.hitC, 0);
    bHits += ao.hitB > 0;
    assert.equal(a.c.state.tracks[1].step, b.c.state.tracks[1].step);
  }
  assert.ok(bHits > 20 && bHits < 80);
});
test('PULSE uses sixteenth notes internally and external clocking stops free running', () => {
  const t = setup('euclidean', { tempo: 120, hits: 16 });
  t.step();
  assert.equal(t.c.state.tracks[0].step, 0);
  assert.deepEqual(
    t.c.state.tracks.map((t) => t.step),
    [0, 0, 0],
  );
  t.step(5998);
  assert.equal(t.c.state.tracks[0].step, 0);
  t.step(3);
  assert.equal(t.c.state.tracks[0].step, 1);
  assert.deepEqual(
    t.c.state.tracks.map((t) => t.step),
    [1, 1, 1],
  );
  t.c.connected.clock = true;
  t.step(48000);
  assert.equal(t.c.state.tracks[0].step, 1);
  t.p.onEvent(t.c, 'reset');
  t.step();
  assert.equal(t.c.state.tracks[0].step, -1);
  t.pulse();
  assert.equal(t.c.state.tracks[0].step, 0);
});
for (const sr of [44100, 48000, 96000])
  test(`TINE models are silent until struck, distinct, finite and naturally decay at ${sr}Hz`, () => {
    const recordings = [];
    for (let model = 0; model < 3; model++) {
      const t = setup('percussion', { model, decay: 0.15 }, sr);
      assert.equal(rms(renderVoice(t, 0.01)), 0);
      t.pulse('trigger');
      const body = renderVoice(t, 0.1);
      recordings.push(body);
      assert.ok(rms(body) > 0.01);
      assert.ok(body.every((v) => Number.isFinite(v) && Math.abs(v) <= 5));
      t.step(sr);
      assert.ok(rms(renderVoice(t, 0.05)) < 0.0001); // Held trigger must not fire again.
      t.p.onEvent(t.c, 'strike');
      assert.ok(rms(renderVoice(t, 0.05)) > 0.01);
    }
    for (let model = 1; model < 3; model++)
      assert.ok(rms(recordings[model].map((v, n) => v - recordings[0][n])) > 0.03);
  });
test('TINE pitch follows 1V/oct, velocity can silence a strike, and tails overlap on retrigger', () => {
  const low = setup('percussion', { strike: 0 }),
    high = setup('percussion', { strike: 0 });
  high.c.inputs.pitch = 1;
  low.pulse('trigger');
  high.pulse('trigger');
  const f = (t) =>
    (Math.atan2(t.c.state.voices[0].rotationSin[0], t.c.state.voices[0].rotationCos[0]) *
      t.c.sampleRate) /
    (2 * Math.PI);
  assert.ok(Math.abs(f(high) / f(low) - 2) < 1e-8);
  const quiet = setup('percussion');
  quiet.c.connected.accent = true;
  quiet.pulse('trigger');
  assert.equal(rms(renderVoice(quiet, 0.1)), 0);
  low.step(1000);
  low.pulse('trigger');
  assert.equal(low.c.state.voices.filter((v) => v.energy > 0).length, 2);
  for (let n = 0; n < 100; n++) {
    low.pulse('trigger');
    const samples = renderVoice(low, 0.002);
    assert.ok(samples.every((v) => Number.isFinite(v) && Math.abs(v) <= 5));
  }
});
test('TINE excludes ultrasonic partials and is bounded across extreme pitch and timbre', () => {
  for (const model of [0, 1, 2])
    for (const pitch of [-20, 20]) {
      const t = setup('percussion', { model, color: 1, morph: 1, decay: 6, strike: 1 });
      t.c.inputs.pitch = pitch;
      t.pulse('trigger');
      assert.ok(renderVoice(t, 0.05).every((v) => Number.isFinite(v) && Math.abs(v) <= 5));
      if (pitch > 0)
        assert.ok(Array.from(t.c.state.voices[0].amplitude).filter((a) => a > 0).length < 4);
    }
});
test('Euclidean rhythm drives percussion through the real rack graph to stereo output', () => {
  const e = new RackEngine();
  e.setPatch({
    version: 2,
    zoom: 1,
    modules: [
      { id: 'rhythm', type: 'euclidean', params: {} },
      { id: 'voice', type: 'percussion', params: {} },
    ],
    output: { id: 'master', type: 'output', params: { level: 0.3 } },
    cables: [
      { from: 'rhythm', fromPort: 'hit', to: 'voice', toPort: 'trigger' },
      { from: 'voice', fromPort: 'out', to: 'master', toPort: 'left' },
    ],
  });
  const left = new Float32Array(96000),
    right = new Float32Array(96000);
  e.render(left, right);
  assert.ok(rms(left) > 0.005);
  assert.deepEqual(left, right);
  assert.ok(left.every((v) => Number.isFinite(v) && Math.abs(v) <= 1));
});
