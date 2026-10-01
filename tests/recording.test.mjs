import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { WavRecorder } from '../src/audio/recorder.js';
import { RackEngine } from '../src/audio/engine.js';
import { loadLib } from './helpers/load-lib.mjs';
const libs = await loadLib(['wav', 'modules', 'patching']);
after(libs.close);
const { recordingWav } = await libs.load('wav');
const { starterPatch, validatePatch, createModule } = await libs.load('modules');
const { beginCable, finishCable } = await libs.load('patching');

test('WAV is stereo PCM with correct rate, channel order, clipping and exact final length', async () => {
  const messages = [],
    chunks = [];
  const recorder = new WavRecorder(44100, (m, transfer) => {
    messages.push(m);
    if (m.chunk) {
      assert.equal(transfer[0], m.chunk);
      chunks.push(m.chunk);
    }
  });
  recorder.start();
  recorder.capture(new Float32Array([-2, 0.5, NaN]), new Float32Array([2, -0.5, 0.25]));
  recorder.stop();
  recorder.stop();
  const bytes = await recordingWav(chunks, 44100).arrayBuffer(),
    view = new DataView(bytes);
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), 'RIFF');
  assert.equal(new TextDecoder().decode(bytes.slice(8, 12)), 'WAVE');
  assert.equal(bytes.byteLength, 44 + 12);
  assert.equal(view.getUint32(4, true), bytes.byteLength - 8);
  assert.equal(view.getUint16(20, true), 1);
  assert.equal(view.getUint16(22, true), 2);
  assert.equal(view.getUint32(24, true), 44100);
  assert.equal(view.getUint32(28, true), 44100 * 4);
  assert.equal(view.getUint32(40, true), 12);
  assert.deepEqual(
    Array.from({ length: 6 }, (_, i) => view.getInt16(44 + i * 2, true)),
    [-32768, 32767, 16384, -16384, 0, 8192],
  );
  assert.equal(messages.filter((m) => m.type === 'recording-done').length, 1);
});

test('recording batches preserve every frame and the memory cap finalises once', () => {
  const messages = [];
  const recorder = new WavRecorder(48000, (m) => messages.push(m));
  recorder.limit = 17003;
  recorder.start();
  for (let n = 0; n < 140; n++) recorder.capture(new Float32Array(128), new Float32Array(128));
  assert.equal(
    messages.filter((m) => m.chunk).reduce((sum, m) => sum + m.chunk.byteLength, 0),
    17003 * 4,
  );
  assert.equal(messages.at(-1).reason, 'limit');
  assert.equal(recorder.active, false);
  recorder.start();
  recorder.capture(new Float32Array(3), new Float32Array(3));
  recorder.stop();
  assert.equal(messages.at(-2).chunk.byteLength, 12);
  assert.equal(messages.at(-2).frames, 3);
});

test('legacy HOME migrates to fixed output with connections, level and mute intact', () => {
  const legacy = starterPatch();
  legacy.output.params.level = 0.21;
  legacy.output.params.mute = 1;
  const output = legacy.output;
  legacy.modules.push(output);
  delete legacy.output;
  const restored = validatePatch(legacy);
  assert.deepEqual(restored.output, output);
  assert.deepEqual(restored.cables, legacy.cables);
  assert.ok(!restored.modules.some((m) => m.id === output.id));
  assert.deepEqual(validatePatch(restored), restored);
  const extra = createModule('output');
  legacy.modules.push(extra);
  assert.ok(validatePatch(legacy).modules.some((m) => m.id === extra.id));
});

test('fixed output can be patched and reconnected, produces stereo and persists', () => {
  let patch = starterPatch();
  patch.cables = [];
  const source = patch.modules.find((m) => m.type === 'oscillator');
  patch = finishCable(
    patch,
    beginCable(patch, { module: source.id, port: 'sine', direction: 'out' }),
    { module: patch.output.id, port: 'left', direction: 'in' },
  );
  assert.equal(validatePatch(patch).cables.length, 1);
  const engine = new RackEngine(48000);
  engine.setPatch(patch);
  const left = new Float32Array(1000),
    right = new Float32Array(1000);
  engine.render(left, right);
  assert.ok(left.some((v) => Math.abs(v) > 0.01));
  assert.deepEqual(left, right);
  const pending = beginCable(patch, { module: patch.output.id, port: 'left', direction: 'in' });
  patch = finishCable(patch, pending, { module: patch.output.id, port: 'right', direction: 'in' });
  engine.setPatch(patch);
  engine.render(left, right);
  assert.ok(left.every((v) => v === 0));
  assert.ok(right.some((v) => Math.abs(v) > 0.01));
  patch.output.params.mute = 1;
  engine.setPatch(patch);
  engine.render(left, right);
  assert.ok(right.every((v) => v === 0));
});
