import test from 'node:test';
import assert from 'node:assert/strict';
import { RackEngine } from '../src/audio/engine.js';
const osc = (id = 'o') => ({ id, type: 'oscillator', params: { tune: 0, fine: 0, fm: 0 } });
const out = { id: 'out', type: 'output', params: { level: 0.5 } };
const seq = {
  id: 's',
  type: 'sequencer',
  params: { tempo: 120, chance: 1, mode: 0 },
  steps: [0, 2, 4, 5, 7, 9, 11, 12],
  gates: Array(8).fill(true),
};
const filter = { id: 'f', type: 'filter', params: { cutoff: 3000, resonance: 0.3, depth: 2 } };
const slope = { id: 'env', type: 'slope', params: { rise: 0.01, fall: 0.1, cycle: 0 } };
const cable = (from, fromPort, to, toPort) => ({ from, fromPort, to, toPort });
function render(engine, seconds = 1) {
  const left = new Float32Array(Math.floor(seconds * 48000)),
    right = new Float32Array(left.length);
  engine.render(left, right);
  return { left, right };
}
const rms = (data) => Math.sqrt(data.reduce((s, x) => s + x * x, 0) / data.length);
test('unpatched rack is silent; oscillator into output makes bounded audio', () => {
  const e = new RackEngine();
  e.setPatch({ modules: [osc(), out], cables: [] });
  assert.equal(rms(render(e).left), 0);
  e.setPatch({ modules: [out, osc()], cables: [cable('o', 'sine', 'out', 'left')] });
  const signal = render(e).left;
  assert.ok(rms(signal) > 0.1);
  assert.ok(signal.every((x) => Number.isFinite(x) && Math.abs(x) <= 1));
});
test('oscillator pitch tracks one volt per octave', () => {
  const e = new RackEngine();
  e.setPatch({
    modules: [{ ...seq, steps: Array(8).fill(12) }, osc(), out],
    cables: [cable('s', 'pitch', 'o', 'pitch'), cable('o', 'sine', 'out', 'left')],
  });
  const signal = render(e, 2).left.slice(48000);
  let crossings = 0;
  for (let i = 1; i < signal.length; i++) if (signal[i - 1] <= 0 && signal[i] > 0) crossings++;
  assert.ok(Math.abs(crossings - 523.251) < 2, `frequency ${crossings}`);
});
test('sequencer advances on audio sample time', () => {
  const e = new RackEngine();
  e.setPatch({ modules: [seq], cables: [] });
  render(e, 0.249);
  assert.equal(e.byId.get('s').context.state.step, 0);
  render(e, 0.002);
  assert.equal(e.byId.get('s').context.state.step, 1);
});
test('complete voice sounds through sequencer, envelope, filter VCA, output', () => {
  const e = new RackEngine();
  e.setPatch({
    modules: [osc(), seq, slope, filter, out],
    cables: [
      cable('s', 'pitch', 'o', 'pitch'),
      cable('s', 'gate', 'env', 'trigger'),
      cable('env', 'out', 'f', 'vca'),
      cable('o', 'saw', 'f', 'in'),
      cable('f', 'low', 'out', 'left'),
    ],
  });
  assert.ok(rms(render(e).left) > 0.015);
});
test('zero probability produces silence through a triggered envelope and VCA', () => {
  const e = new RackEngine();
  e.setPatch({
    modules: [osc(), { ...seq, params: { ...seq.params, chance: 0 } }, slope, filter, out],
    cables: [
      cable('s', 'gate', 'env', 'trigger'),
      cable('env', 'out', 'f', 'vca'),
      cable('o', 'saw', 'f', 'in'),
      cable('f', 'low', 'out', 'left'),
    ],
  });
  assert.equal(rms(render(e).left), 0);
});
test('cycling function generates a repeating envelope and end-of-cycle pulse', () => {
  const e = new RackEngine();
  e.setPatch({ modules: [{ ...slope, params: { rise: 0.01, fall: 0.01, cycle: 1 } }], cables: [] });
  render(e, 0.01);
  assert.ok(e.byId.get('env').context.outputs.out > 4.9);
  render(e, 0.0101);
  assert.equal(e.byId.get('env').context.outputs.eoc, 5);
  render(e, 0.01);
  assert.ok(e.byId.get('env').context.outputs.out > 4.8);
});
test('graph edits preserve oscillator phase and sequence position', () => {
  const e = new RackEngine();
  const p = { modules: [seq, osc(), out], cables: [cable('o', 'sine', 'out', 'left')] };
  e.setPatch(p);
  render(e, 0.3);
  const phase = e.byId.get('o').context.state.phase,
    step = e.byId.get('s').context.state.step;
  e.setPatch({ ...p, modules: [...p.modules].reverse() });
  assert.equal(e.byId.get('o').context.state.phase, phase);
  assert.equal(e.byId.get('s').context.state.step, step);
});
test('resonant filter with feedback remains finite and output stays limited', () => {
  const e = new RackEngine();
  e.setPatch({
    modules: [
      { ...osc(), params: { ...osc().params, fm: 1 } },
      { ...filter, params: { cutoff: 16000, resonance: 0.95, depth: 5 } },
      out,
    ],
    cables: [
      cable('o', 'saw', 'f', 'in'),
      cable('f', 'high', 'o', 'fm'),
      cable('f', 'low', 'out', 'left'),
    ],
  });
  assert.ok(render(e, 2).left.every((x) => Number.isFinite(x) && Math.abs(x) <= 1));
});
test('left output normals to stereo; a patched right input is independent', () => {
  const e = new RackEngine();
  e.setPatch({ modules: [osc(), out], cables: [cable('o', 'sine', 'out', 'left')] });
  let audio = render(e, 0.1);
  assert.deepEqual(audio.left, audio.right);
  e.setPatch({ modules: [osc(), out], cables: [cable('o', 'sine', 'out', 'right')] });
  audio = render(e, 0.1);
  assert.equal(rms(audio.left), 0);
  assert.ok(rms(audio.right) > 0.1);
});
test('disconnecting the output stops audio', () => {
  const e = new RackEngine();
  e.setPatch({ modules: [osc(), out], cables: [cable('o', 'sine', 'out', 'left')] });
  render(e, 0.1);
  e.setPatch({ modules: [osc(), out], cables: [] });
  assert.equal(rms(render(e).left), 0);
});
