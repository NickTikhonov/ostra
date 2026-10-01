import test from 'node:test';
import assert from 'node:assert/strict';
import processor from '../src/modules/reverb/processor.js';
import { definition } from '../src/modules/reverb/definition.js';
function context(params = {}, sampleRate = 48000) {
  return {
    sampleRate,
    params: { ...Object.fromEntries(definition.params.map((p) => [p.id, p.default])), ...params },
    inputs: Object.fromEntries(definition.inputs.map((p) => [p.id, 0])),
    outputs: {},
    connected: {},
    outputConnected: {},
    state: processor.createState(sampleRate),
    data: {},
    stereo: { left: 0, right: 0 },
  };
}
function render(c, seconds, source = () => 0) {
  const length = Math.round(c.sampleRate * seconds),
    left = new Float32Array(length),
    right = new Float32Array(length);
  for (let n = 0; n < length; n++) {
    c.inputs.left = source(n);
    processor.process(c);
    left[n] = c.outputs.left;
    right[n] = c.outputs.right;
  }
  return { left, right };
}
const energy = (a) => a.reduce((sum, v) => sum + v * v, 0) / a.length;
const impulse = (params = {}, seconds = 3) =>
  render(context({ mix: 1, predelay: 0, ...params }), seconds, (n) => (n === 0 ? 5 : 0));

test('unexcited HALO is silent; MIX=0 preserves dry mono and stereo routing', () => {
  const silent = render(context(), 0.2);
  assert.equal(energy(silent.left), 0);
  assert.equal(energy(silent.right), 0);
  const c = context({ mix: 0 });
  c.inputs.left = 2;
  processor.process(c);
  assert.equal(c.outputs.left, 2);
  assert.equal(c.outputs.right, 2);
  c.connected.right = true;
  c.inputs.right = -3;
  processor.process(c);
  assert.equal(c.outputs.left, 2);
  assert.equal(c.outputs.right, -3);
});

test('an impulse produces a stereo tail that decays, and WIDTH=0 collapses only the wet signal', () => {
  const { left, right } = impulse({ decay: 1.2, width: 1 }, 3);
  assert.ok(energy(left.slice(4800, 24000)) > 1e-5);
  assert.ok(energy(right.slice(4800, 24000)) > 1e-5);
  let difference = 0;
  for (let n = 4800; n < 24000; n++) difference += (left[n] - right[n]) ** 2;
  assert.ok(difference > 0.01);
  assert.ok(energy(left.slice(96000)) < energy(left.slice(4800, 24000)) * 0.005);
  const mono = impulse({ width: 0 }, 0.3);
  assert.deepEqual(mono.left, mono.right);
});

test('pre-delay shifts the wet impulse by the requested time without delaying dry audio', () => {
  const dry = impulse({ predelay: 0 }, 0.25),
    late = impulse({ predelay: 0.1 }, 0.35);
  const first = (a) => a.findIndex((v) => Math.abs(v) > 1e-5);
  assert.equal(first(late.left) - first(dry.left), 4800);
  for (let n = 0; n < dry.left.length; n++)
    assert.ok(Math.abs(late.left[n + 4800] - dry.left[n]) < 1e-5);
  const c = context({ mix: 0, predelay: 0.2 });
  c.inputs.left = 3;
  processor.process(c);
  assert.equal(c.outputs.left, 3);
});

test('decay knob and decay CV extend the tail; dark tone reduces high-frequency energy', () => {
  const short = impulse({ decay: 0.4 }),
    long = impulse({ decay: 6 });
  assert.ok(energy(long.left.slice(72000)) > energy(short.left.slice(72000)) * 100);
  const base = context({ mix: 1, predelay: 0, decay: 1 }),
    cv = context({ mix: 1, predelay: 0, decay: 1 });
  cv.inputs.decay = 5;
  const a = render(base, 2, (n) => (n === 0 ? 5 : 0)),
    b = render(cv, 2, (n) => (n === 0 ? 5 : 0));
  assert.ok(energy(b.left.slice(48000)) > energy(a.left.slice(48000)) * 2);
  const bright = impulse({ tone: 16000 }),
    dark = impulse({ tone: 600 });
  const roughness = (a) => {
    let e = 0;
    for (let n = 1; n < a.length; n++) e += (a[n] - a[n - 1]) ** 2;
    return e / a.length / energy(a);
  };
  assert.ok(
    roughness(bright.left.slice(24000, 48000)) > roughness(dark.left.slice(24000, 48000)) * 2,
  );
});

test('freeze holds a finite tail and excludes new input after its short fade', () => {
  const a = context({ mix: 1, decay: 3, predelay: 0 }),
    b = context({ mix: 1, decay: 3, predelay: 0 });
  render(a, 0.3, (n) => (n === 0 ? 5 : 0));
  render(b, 0.3, (n) => (n === 0 ? 5 : 0));
  a.params.freeze = 1;
  b.inputs.freeze = 5;
  render(a, 0.4);
  render(b, 0.4);
  assert.equal(processor.getDisplayState(a.state).frozen, true);
  assert.equal(a.state.freeze, 1);
  const before = render(a, 0.5),
    withInput = render(b, 0.5, () => 5);
  assert.deepEqual(before.left, withInput.left);
  assert.deepEqual(before.right, withInput.right);
  render(a, 2);
  const after = render(a, 0.5);
  const ratio = energy(after.left) / energy(before.left);
  assert.ok(ratio > 0.4 && ratio < 2.5, `frozen energy ratio ${ratio}`);
  a.params.freeze = 0;
  render(a, 4);
  assert.equal(processor.getDisplayState(a.state).frozen, false);
  assert.ok(energy(render(a, 0.5).left) < energy(after.left) * 0.01);
});

test('mix CV spans dry to wet, and long tails remain finite across sample rates and control changes', () => {
  const dry = context({ mix: 0.5 });
  dry.inputs.mix = -10;
  dry.inputs.left = 4;
  processor.process(dry);
  assert.equal(dry.outputs.left, 4);
  const wet = context({ mix: 0.5 });
  wet.inputs.mix = 10;
  wet.inputs.left = 4;
  processor.process(wet);
  assert.equal(wet.outputs.left, 0);
  for (const sr of [44100, 96000]) {
    const c = context({ mix: 1, decay: 20 }, sr);
    c.connected.right = true;
    c.inputs.decay = 10;
    for (let n = 0; n < sr * 2; n++) {
      c.params.size = (n % sr) / sr;
      c.params.predelay = 0.1 * (1 + Math.sin((n / sr) * 10));
      c.inputs.left = 8 * Math.sin(n * 0.03);
      c.inputs.right = -c.inputs.left;
      c.inputs.freeze = n > sr && n < sr * 1.4 ? 5 : 0;
      processor.process(c);
      assert.ok(Number.isFinite(c.outputs.left) && Math.abs(c.outputs.left) <= 40);
      assert.ok(Number.isFinite(c.outputs.right) && Math.abs(c.outputs.right) <= 40);
    }
  }
});
