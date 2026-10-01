import test from 'node:test';
import assert from 'node:assert/strict';
import { AUDIO_MODULES } from '../src/modules/audio.generated.js';
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
    data: d.createData?.() ?? {},
    stereo: { left: 0, right: 0 },
  };
  return {
    c,
    p,
    step(n = 1) {
      for (let i = 0; i < n; i++) p.process(c);
      return c.outputs;
    },
    pulse(port = 'clock') {
      c.inputs[port] = 0;
      p.process(c);
      c.inputs[port] = 5;
      p.process(c);
      return c.outputs;
    },
  };
}
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
test('CHANCE holds externally sampled voltages, respects hold and gate probability, and bounds random/noise', () => {
  const t = setup('random', { chance: 1 });
  t.c.connected.clock = true;
  t.c.connected.sample = true;
  t.c.inputs.sample = -3.25;
  t.pulse();
  near(t.c.outputs.step, -3.25);
  assert.equal(t.c.outputs.gate, 5);
  t.c.inputs.sample = 4;
  t.step(100);
  near(t.c.outputs.step, -3.25);
  t.c.inputs.hold = 5;
  t.pulse();
  near(t.c.outputs.step, -3.25);
  t.c.inputs.hold = 0;
  t.pulse();
  near(t.c.outputs.step, 4);
  assert.ok(t.c.outputs.smooth < 4);
  const r = setup('random', { polarity: 1, range: 3, chance: 0 });
  for (let n = 0; n < 10000; n++) {
    r.step();
    assert.ok(Math.abs(r.c.outputs.step) <= 3);
    assert.ok(Math.abs(r.c.outputs.noise) <= 5);
    assert.equal(r.c.outputs.gate, 0);
  }
});
test('JUNCTION routes CV/audio in both directions, advances, resets, and clock-samples addressing', () => {
  const t = setup('switch');
  Object.assign(t.c.inputs, { in1: -2, in2: 3, in3: 4, in4: 5, signal: 7 });
  t.step();
  near(t.c.outputs.out, -2);
  near(t.c.outputs.out1, 7);
  near(t.c.outputs.out2, 0);
  t.pulse();
  near(t.c.outputs.out, 3);
  t.pulse('reset');
  near(t.c.outputs.out, -2);
  t.c.connected.address = true;
  t.c.inputs.address = 5;
  t.step();
  near(t.c.outputs.out, 5);
  t.c.params.mode = 1;
  t.c.inputs.address = 0;
  t.step();
  near(t.c.outputs.out, 5);
  t.pulse();
  near(t.c.outputs.out, -2);
  t.c.params.length = 2;
  t.c.inputs.address = 5;
  t.pulse();
  near(t.c.outputs.out, 3);
});
test('RELAY gives exact 1–4-clock delays, all taps at once, with hold and reset priority', () => {
  const t = setup('shift-register');
  for (let n = 1; n <= 5; n++) {
    t.c.inputs.in = n;
    t.pulse();
  }
  assert.deepEqual(t.c.outputs, { now: 5, tap1: 4, tap2: 3, tap3: 2, tap4: 1, out: 1 });
  t.c.params.tap = 2;
  t.step(50);
  near(t.c.outputs.out, 3);
  t.c.inputs.hold = 5;
  t.c.inputs.in = 9;
  t.pulse();
  near(t.c.outputs.now, 5);
  t.c.inputs.reset = 5;
  t.c.inputs.clock = 0;
  t.step();
  assert.ok(Object.values(t.c.outputs).every((v) => v === 0));
});
test('LOGIC truth table and comparator hysteresis are independent', () => {
  const t = setup('logic', { hysteresis: 0.2 });
  for (const [a, b] of [
    [0, 0],
    [0, 5],
    [5, 0],
    [5, 5],
  ]) {
    Object.assign(t.c.inputs, { a, b });
    const o = t.step();
    assert.equal(o.and, a && b ? 5 : 0);
    assert.equal(o.or, a || b ? 5 : 0);
    assert.equal(o.xor, !!a !== !!b ? 5 : 0);
    assert.equal(o.not, a ? 0 : 5);
  }
  t.c.inputs.signal = 0.2;
  t.step();
  assert.equal(t.c.outputs.high, 5);
  t.c.inputs.signal = -0.05;
  t.step();
  assert.equal(t.c.outputs.high, 5);
  t.c.inputs.signal = -0.2;
  t.step();
  assert.equal(t.c.outputs.high, 0);
  assert.equal(t.c.outputs.low, 5);
  t.c.inputs.threshold = -2;
  t.step();
  assert.equal(t.c.outputs.high, 5);
});
test('HARBOUR pans mono, balances stereo, and keeps returns out of its send bus', () => {
  const t = setup('stereo-mixer', { level1: 1, pan1: -1, send1: 0.5, master: 1, return: 1 });
  t.c.inputs.left1 = 4;
  t.step();
  near(t.c.outputs.left, 4);
  near(t.c.outputs.right, 0);
  near(t.c.outputs.sendL, 2);
  t.c.params.pan1 = 1;
  t.step();
  near(t.c.outputs.right, 4);
  near(t.c.outputs.left, 0);
  t.c.connected.right1 = true;
  t.c.inputs.right1 = -2;
  t.c.params.pan1 = 0;
  t.step();
  near(t.c.outputs.left, 4);
  near(t.c.outputs.right, -2);
  t.c.inputs.returnL = 3;
  t.step();
  near(t.c.outputs.left, 7);
  near(t.c.outputs.right, 1);
  near(t.c.outputs.sendL, 2);
  near(t.c.outputs.sendR, -1);
  t.c.params.master = 0;
  t.step();
  near(t.c.outputs.left, 0);
  near(t.c.outputs.sendL, 2);
});
test('VECTOR supports slew, CV time scaling, cycling and normalled summing', () => {
  const t = setup('maths', { rise1: 0.01, fall1: 0.01, att1: 1, att2: 0.2 });
  t.c.connected.in1 = true;
  t.c.inputs.in1 = 5;
  t.step(240);
  near(t.c.outputs.unity1, 5);
  near(t.c.outputs.sum, 7);
  t.c.outputConnected.ch1 = true;
  t.step();
  near(t.c.outputs.sum, 2);
  t.c.inputs.in1 = 0;
  t.step(240);
  near(t.c.outputs.unity1, 0);
  t.c.params.cycle4 = 1;
  t.step(20000);
  assert.ok(t.c.outputs.unity4 > 0);
  assert.ok(Number.isFinite(t.c.outputs.ch4));
});
function sample(t, frames = 4800) {
  const left = Float32Array.from({ length: frames }, (_, n) => Math.sin(n * 0.12) * 0.5);
  t.c.asset = { sampleRate: 48000, channels: [left, Float32Array.from(left, (v) => -v)] };
  return t;
}
test('GRAIN one-shot is silent until triggered, preserves stereo, emits END and tracks pitch/sample rate', () => {
  const t = sample(setup('sampler'));
  t.step(100);
  near(t.c.outputs.left, 0);
  t.pulse('trigger');
  let peak = 0;
  for (let n = 0; n < 4800; n++) {
    t.step();
    near(t.c.outputs.left, -t.c.outputs.right);
    peak = Math.max(peak, Math.abs(t.c.outputs.left));
  }
  assert.ok(peak > 1);
  assert.equal(t.c.state.playing, false);
  assert.equal(t.c.outputs.end, 5);
  for (const sr of [44100, 96000]) {
    const t = sample(setup('sampler', {}, sr));
    t.c.inputs.pitch = 1;
    t.pulse('trigger');
    t.step(Math.ceil(sr * 0.05));
    assert.equal(t.c.state.playing, false);
  }
});
test('GRAIN loops, reverses, scans granular positions and obeys loop/grain gate without unbounded voices', () => {
  const t = sample(setup('sampler', { mode: 1 }));
  t.step(15000);
  assert.equal(t.c.state.playing, true);
  assert.ok(t.c.state.pos < 4800);
  t.c.connected.gate = true;
  t.step(3000);
  assert.ok(Math.abs(t.c.outputs.left) < 1e-6);
  t.c.params.mode = 2;
  t.c.params.grain = 0.4;
  t.c.params.density = 40;
  t.c.params.spray = 1;
  t.c.inputs.gate = 5;
  t.c.params.reverse = 1;
  t.c.inputs.position = 2.5;
  let peak = 0;
  for (let n = 0; n < 100000; n++) {
    t.step();
    assert.ok(Number.isFinite(t.c.outputs.left) && Math.abs(t.c.outputs.left) <= 10);
    peak = Math.max(peak, Math.abs(t.c.outputs.left));
  }
  assert.ok(peak > 0.01);
  assert.ok(t.c.state.grains.filter((g) => g.life).length <= 32);
  near(t.c.state.progress, 2399 / 4800);
  t.c.asset = null;
  t.step();
  near(t.c.outputs.left, 0);
  near(t.c.outputs.right, 0);
});
test('audio assets arrive separately, survive parameter edits, and release without stale playback', () => {
  const e = new RackEngine(),
    d = AUDIO_MODULES.sampler.definition,
    m = {
      id: 'grain',
      type: 'sampler',
      version: 1,
      params: { mode: 1 },
      data: { assetId: 'sample-1', name: 'test.wav', duration: 0.1, peaks: [] },
    };
  e.setPatch({ modules: [m], cables: [] });
  assert.equal(e.byId.get('grain').context.asset, null);
  const asset = { sampleRate: 48000, channels: [new Float32Array(4800).fill(0.2)] };
  e.setAsset('sample-1', asset);
  assert.equal(e.byId.get('grain').context.asset, asset);
  e.setPatch({ modules: [{ ...m, params: { mode: 1, tune: 12 } }], cables: [] });
  assert.equal(e.byId.get('grain').context.asset, asset);
  e.render(new Float32Array(512), new Float32Array(512));
  assert.ok(e.byId.get('grain').context.outputs.left > 0);
  e.setAsset('sample-1', null);
  e.render(new Float32Array(128), new Float32Array(128));
  assert.equal(e.byId.get('grain').context.outputs.left, 0);
});
test('generative sample patch runs through the full engine with bounded stereo output', () => {
  const make = (id, type, params = {}, data = {}) => ({
    id,
    type,
    version: AUDIO_MODULES[type].definition.version,
    params,
    data,
  });
  const modules = [
    make('clock', 'clock'),
    make('random', 'random'),
    make('relay', 'shift-register'),
    make('grain', 'sampler', { mode: 2 }, { assetId: 'fixture' }),
    make('mix', 'stereo-mixer'),
    make('home', 'output'),
  ];
  const wires = [
    ['clock', 'clock', 'random', 'clock'],
    ['clock', 'clock', 'relay', 'clock'],
    ['random', 'step', 'relay', 'in'],
    ['relay', 'out', 'grain', 'position'],
    ['grain', 'left', 'mix', 'left1'],
    ['grain', 'right', 'mix', 'right1'],
    ['mix', 'left', 'home', 'left'],
    ['mix', 'right', 'home', 'right'],
  ];
  const e = new RackEngine();
  e.setPatch({
    modules,
    cables: wires.map(([from, fromPort, to, toPort]) => ({ from, fromPort, to, toPort })),
  });
  const left = Float32Array.from({ length: 48000 }, (_, n) => Math.sin(n * 0.05) * 0.2);
  e.setAsset('fixture', {
    sampleRate: 48000,
    channels: [left, Float32Array.from(left, (v) => -v)],
  });
  const l = new Float32Array(48000),
    r = new Float32Array(48000);
  e.render(l, r);
  assert.ok(l.some((v) => Math.abs(v) > 0.001));
  assert.ok(l.every((v) => Number.isFinite(v) && Math.abs(v) <= 1));
  assert.ok(r.every((v, n) => Math.abs(v + l[n]) < 1e-6));
});
