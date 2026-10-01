import test from 'node:test';
import assert from 'node:assert/strict';
import processor from '../src/modules/quantiser/processor.js';
import { definition } from '../src/modules/quantiser/definition.js';
import {
  CHANNELS,
  createData,
  restoreData,
  scaleMask,
  pitchClass,
} from '../src/modules/quantiser/data.js';
function context(params = {}, data = createData()) {
  return {
    sampleRate: 48000,
    params: { root: 0, scale: 1, octave: 0, ...params },
    data,
    state: processor.createState(),
    inputs: Object.fromEntries(definition.inputs.map((p) => [p.id, 0])),
    outputs: {},
    connected: {},
    outputConnected: {},
    stereo: { left: 0, right: 0 },
  };
}
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);
const step = (c, n = 1) => {
  for (let i = 0; i < n; i++) processor.process(c);
};

test('four inputs quantise independently to one shared custom scale', () => {
  const c = context({}, { noteMask: (1 << 0) | (1 << 4) | (1 << 7) });
  [0.11, 0.39, 0.59, -0.09].forEach((v, n) => {
    c.inputs[CHANNELS[n].pitch] = v;
    c.connected[CHANNELS[n].pitch] = true;
  });
  step(c);
  [0, 4 / 12, 7 / 12, 0].forEach((v, n) => near(c.outputs[CHANNELS[n].pitch], v));
  c.data.noteMask = 1 << 2;
  step(c);
  for (const channel of CHANNELS)
    assert.equal(pitchClass(Math.round(c.outputs[channel.pitch] * 12)), 2);
});

test('each trigger holds its own channel, including across scale edits', () => {
  const c = context();
  c.connected.trigger = true;
  c.connected.trigger2 = true;
  c.inputs.pitch = 0.3;
  c.inputs.pitch2 = 0.6;
  step(c);
  assert.equal(c.outputs.pitch, 0);
  assert.equal(c.outputs.pitch2, 0);
  c.inputs.trigger = 5;
  step(c);
  near(c.outputs.pitch, 4 / 12);
  assert.equal(c.outputs.pitch2, 0);
  c.inputs.pitch = 1;
  c.inputs.pitch2 = 1.5;
  c.data.noteMask = 1;
  step(c);
  near(c.outputs.pitch, 4 / 12);
  c.inputs.trigger2 = 5;
  step(c);
  near(c.outputs.pitch2, 1);
  near(c.outputs.pitch, 4 / 12);
  c.inputs.trigger = 0;
  step(c);
  c.inputs.trigger = 5;
  step(c);
  near(c.outputs.pitch, 1);
  c.connected.trigger = false;
  c.inputs.pitch = 2;
  step(c);
  near(c.outputs.pitch, 2);
});

test('shared root, pre-quantisation shift, octave and negative volts agree with displayed pitch', () => {
  const c = context({ root: 2, octave: -1 }, { noteMask: 1 });
  c.inputs.pitch = -0.5;
  c.inputs.transpose = 1 / 12;
  c.connected.pitch = true;
  step(c);
  near(c.outputs.pitch, -10 / 12 - 1);
  const d = processor.getDisplayState(c.state);
  assert.equal(d.note0, -22);
  assert.equal(d.active0, true);
  assert.equal(d.active1, false);
  c.connected.transpose = true;
  step(c);
  assert.equal(processor.getDisplayState(c.state).active1, true);
});

test('display marks only active channels and reports simultaneous voices on a note', () => {
  const c = context();
  c.connected.pitch = true;
  c.connected.pitch3 = true;
  c.inputs.pitch = 0;
  c.inputs.pitch3 = 1;
  step(c);
  const d = processor.getDisplayState(c.state);
  assert.equal(d.active0, true);
  assert.equal(d.active1, false);
  assert.equal(d.active2, true);
  assert.equal(d.active3, false);
  assert.equal(d.note0, 0);
  assert.equal(d.note2, 12);
  assert.equal(d.flash0, true);
  step(c, 4800);
  assert.equal(processor.getDisplayState(c.state).flash0, false);
  assert.equal(processor.getDisplayState(c.state).note2, 12);
});

test('note-change outputs pulse for 8ms; retriggering a held note lights it without a false change pulse', () => {
  const c = context();
  c.connected.trigger = true;
  c.connected.pitch = true;
  c.inputs.trigger = 5;
  step(c);
  assert.equal(c.outputs.trigger, 5);
  step(c, 384);
  assert.equal(c.outputs.trigger, 0);
  c.inputs.trigger = 0;
  step(c);
  c.inputs.trigger = 5;
  step(c);
  assert.equal(c.outputs.trigger, 0);
  assert.equal(processor.getDisplayState(c.state).flash0, true);
  c.inputs.trigger = 0;
  c.inputs.pitch = 1;
  step(c);
  c.inputs.trigger = 5;
  step(c);
  assert.equal(c.outputs.trigger, 5);
});

test('custom scale validation and persistence preserve a non-empty scale and old channel IDs', () => {
  const saved = JSON.parse(JSON.stringify({ version: 2, data: { noteMask: 145 } }));
  assert.deepEqual(restoreData(saved), { noteMask: 145 });
  for (const noteMask of [0, -1, 4096, 2.5, '145', null])
    assert.deepEqual(restoreData({ data: { noteMask } }), { noteMask: null });
  assert.deepEqual(restoreData({ version: 1, data: {} }), createData());
  assert.equal(
    scaleMask({ noteMask: 4096 }, { root: 0, scale: 1 }),
    scaleMask(createData(), { root: 0, scale: 1 }),
  );
  for (const direction of ['inputs', 'outputs'])
    for (const id of ['pitch', 'trigger'])
      assert.ok(definition[direction].some((p) => p.id === id));
  assert.ok(definition.inputs.some((p) => p.id === 'transpose'));
});

test('all presets and roots preserve the previous PRISM quantisation', () => {
  const scales = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    [0, 2, 4, 5, 7, 9, 11],
    [0, 2, 3, 5, 7, 8, 10],
    [0, 2, 4, 7, 9],
    [0, 2, 3, 5, 7, 9, 10],
    [0, 2, 4, 6, 8, 10],
    [0, 7],
  ];
  for (let root = 0; root < 12; root++)
    for (let scale = 0; scale < 7; scale++)
      for (const input of [-9.94, -2.234, -1.001, -0.28, 0, 0.141, 0.493, 1.019, 9.96]) {
        const c = context({ root, scale });
        c.inputs.pitch = input;
        step(c);
        const note = input * 12 - root,
          octave = Math.floor(note / 12);
        let best = 0,
          distance = Infinity;
        for (let oct = octave - 1; oct <= octave + 1; oct++)
          for (const interval of scales[scale]) {
            const v = oct * 12 + interval,
              d = Math.abs(note - v);
            if (d < distance) {
              best = v;
              distance = d;
            }
          }
        near(c.outputs.pitch, Math.max(-10, Math.min(10, (best + root) / 12)));
      }
});
