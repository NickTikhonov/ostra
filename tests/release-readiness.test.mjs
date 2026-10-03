import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';
import { loadLib } from './helpers/load-lib.mjs';
const libs = await loadLib([
  'modules',
  'placement',
  'storage',
  'patching',
  'sample-assets',
  'sample-maintenance',
  'audio',
  'wav',
]);
after(libs.close);
const { createModule, DEFINITIONS, STORAGE_KEY } = await libs.load('modules');
const { finishCable } = await libs.load('patching');
const { saveRack, restoreRack } = await libs.load('storage');
const { AudioEngine } = await libs.load('audio');
const { getSample, pruneSamples, importSample, releaseImportedSample } =
  await libs.load('sample-assets');
const { sampleReferences, startSampleMaintenance } = await libs.load('sample-maintenance');
globalThis.indexedDB = indexedDB;
const empty = () => ({
  version: 2,
  modules: [],
  output: createModule('output'),
  cables: [],
  zoom: 1,
});
const storage = () => {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};
const withSample = (id) => {
  const patch = empty(),
    m = createModule('sampler');
  m.data.assetId = id;
  patch.modules.push(m);
  return patch;
};
const tick = () => new Promise((resolve) => setImmediate(resolve));
async function seed(...ids) {
  await getSample('initialise');
  const db = await new Promise((resolve, reject) => {
    const r = indexedDB.open('modular-workshop:samples:v1', 1);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  await new Promise((resolve, reject) => {
    const tx = db.transaction('samples', 'readwrite');
    for (const id of ids)
      tx.objectStore('samples').put({
        id,
        name: id,
        duration: 1,
        peaks: [],
        sampleRate: 48000,
        channels: [new Float32Array([0, 0.5, 0])],
      });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

test('257+ editor-created cables survive saving, loading and reconnection', () => {
  let patch = empty();
  patch.modules = Array.from({ length: 19 }, (_, n) => createModule('maths', 42, 42 + n * 430));
  for (const module of patch.modules)
    for (const port of DEFINITIONS.maths.inputs)
      patch = finishCable(
        patch,
        { fixed: { module: patch.modules[0].id, port: 'sum', direction: 'out' }, color: '#e68554' },
        { module: module.id, port: port.id, direction: 'in' },
      );
  assert.equal(patch.cables.length, 266);
  const saved = storage();
  saveRack(saved, patch);
  assert.deepEqual(restoreRack(saved), { patch, recovered: false });
  const original = patch.cables[0];
  const moved = finishCable(
    patch,
    {
      cableId: original.id,
      color: original.color,
      fixed: { module: original.to, port: original.toPort, direction: 'in' },
    },
    { module: patch.modules[1].id, port: 'or', direction: 'out' },
  );
  assert.equal(moved.cables.length, 266);
  assert.equal(moved.cables.at(-1).from, patch.modules[1].id);
  saveRack(saved, moved);
  assert.deepEqual(restoreRack(saved).patch, moved);
});

const contexts = [],
  nodes = [];
class FakeContext {
  sampleRate = 48000;
  get state() {
    return this.resumed ? 'running' : 'suspended';
  }
  currentTime = 0;
  audioWorklet = { addModule: async () => {} };
  destination = {};
  resumed = false;
  closed = false;
  constructor() {
    contexts.push(this);
  }
  createGain() {
    return (this.gain = {
      gain: {
        value: 0,
        setTargetAtTime: (value) => {
          this.level = value;
        },
      },
      connect() {},
      disconnect() {},
    });
  }
  async resume() {
    this.resumed = true;
  }
  async suspend() {
    this.resumed = false;
  }
  async close() {
    this.closed = true;
  }
}
class FakeNode {
  messages = [];
  port = {
    postMessage: (message) => this.messages.push(message),
    close: () => {
      this.portClosed = true;
    },
  };
  constructor() {
    nodes.push(this);
  }
  connect() {}
  disconnect() {
    this.disconnected = true;
  }
}
globalThis.AudioContext = FakeContext;
globalThis.AudioWorkletNode = FakeNode;

test('stopping transport waits for the final recording chunk before suspending', async () => {
  const engine = new AudioEngine(),
    completed = [];
  engine.onRecordingComplete = (wav, reason) => completed.push({ wav, reason });
  await engine.start(empty());
  engine.startRecording();
  const node = engine.node,
    context = engine.context;
  assert.equal(node.messages.at(-1).type, 'record-start');
  const stopped = engine.stop();
  assert.equal(node.messages.at(-1).type, 'record-stop');
  assert.equal(context.resumed, true);
  node.port.onmessage({
    data: { type: 'recording-chunk', chunk: new ArrayBuffer(512), frames: 128 },
  });
  node.port.onmessage({ data: { type: 'recording-done', reason: 'stopped' } });
  await stopped;
  assert.equal(context.resumed, false);
  assert.equal(completed.length, 1);
  assert.equal(completed[0].wav.size, 556);
  assert.equal(completed[0].reason, 'stopped');
  await engine.close();
  assert.equal(completed.length, 1);
});

test('processor failure salvages captured WAV chunks and permits another recording', async () => {
  const engine = new AudioEngine(),
    completed = [];
  engine.onRecordingComplete = (wav, reason) => completed.push({ wav, reason });
  await engine.start(empty());
  engine.startRecording();
  engine.node.port.onmessage({
    data: { type: 'recording-chunk', chunk: new ArrayBuffer(16), frames: 4 },
  });
  engine.node.onprocessorerror();
  assert.equal(completed[0].wav.size, 60);
  assert.equal(completed[0].reason, 'interrupted');
  await engine.start(empty());
  engine.startRecording();
  engine.node.port.onmessage({ data: { type: 'recording-done', reason: 'stopped' } });
  assert.equal(completed.length, 2);
  await engine.close();
});

test('a missing sample leaves only its sampler empty and reports once per start', async () => {
  await seed('available');
  const patch = withSample('missing');
  patch.modules.push(
    withSample('available').modules[0],
    createModule('oscillator'),
    createModule('output'),
  );
  const engine = new AudioEngine(),
    errors = [];
  engine.onError = (m) => errors.push(m);
  await engine.start(patch);
  assert.equal(contexts.at(-1).resumed, true);
  assert.equal(contexts.at(-1).level, 1);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /missing/);
  assert.ok(engine.node.messages.some((m) => m.type === 'asset' && m.id === 'available'));
  engine.update({
    ...patch,
    modules: patch.modules.map((m) => ({ ...m, params: { ...m.params, tune: 1 } })),
  });
  await tick();
  assert.equal(errors.length, 1);
  await engine.stop();
  await engine.start(patch);
  assert.equal(errors.length, 2);
  await engine.close();
});

test('IndexedDB failures do not block unrelated voices', async () => {
  const engine = new AudioEngine(),
    errors = [];
  engine.onError = (m) => errors.push(m);
  globalThis.indexedDB = {
    open() {
      throw new Error('storage denied');
    },
  };
  try {
    await engine.start(withSample('unreadable'));
    assert.equal(engine.context.resumed, true);
    assert.match(errors[0], /storage denied/);
  } finally {
    globalThis.indexedDB = indexedDB;
    await engine.close();
  }
});

test('native processor errors disconnect the failed node and restart with fresh assets', async () => {
  await seed('restart-asset');
  const patch = withSample('restart-asset');
  const engine = new AudioEngine(),
    errors = [];
  let stopped = 0;
  engine.onStopped = () => stopped++;
  engine.onError = (m) => errors.push(m);
  await engine.start(patch);
  const oldNode = engine.node,
    oldContext = engine.context;
  oldNode.onprocessorerror();
  await tick();
  assert.equal(stopped, 1);
  assert.equal(oldNode.disconnected, true);
  assert.equal(oldNode.portClosed, true);
  assert.equal(oldContext.closed, true);
  assert.equal(engine.node, null);
  assert.match(errors[0], /Press Play/);
  await engine.start(patch);
  assert.notEqual(engine.node, oldNode);
  assert.ok(engine.node.messages.some((m) => m.type === 'asset' && m.id === 'restart-asset'));
  await engine.close();
});

test('worklet-reported failures also stop transport and can restart', async () => {
  const engine = new AudioEngine();
  let stopped = 0;
  engine.onStopped = () => stopped++;
  await engine.start(empty());
  engine.node.port.onmessage({ data: { type: 'error', message: 'sampler: broken processor' } });
  assert.equal(stopped, 1);
  assert.equal(engine.context, null);
  await engine.start(empty());
  assert.equal(engine.context.resumed, true);
  await engine.close();
});

test('cleanup retains current, undo, redo, saved and recovery sample references', async () => {
  await seed('current', 'undo', 'redo', 'saved', 'recovery', 'tutorial', 'orphan');
  const saved = storage();
  saveRack(saved, withSample('saved'));
  saved.setItem(`${STORAGE_KEY}:recovery`, JSON.stringify(withSample('recovery')));
  saved.setItem(
    'ostra:tutorial:v1',
    JSON.stringify({ ...withSample('tutorial'), tutorialStep: 13 }),
  );
  const keep = sampleReferences(['current', 'undo', 'redo'].map(withSample), saved);
  await pruneSamples(keep);
  for (const id of ['current', 'undo', 'redo', 'saved', 'recovery', 'tutorial'])
    assert.ok(await getSample(id), id);
  assert.equal(await getSample('orphan'), null);
  await pruneSamples(sampleReferences([withSample('current')], saved));
  assert.equal(await getSample('undo'), null);
  assert.equal(await getSample('redo'), null);
  saved.setItem(`${STORAGE_KEY}:recovery`, 'corrupt');
  assert.equal(sampleReferences([], saved), null);
});

test('an imported sample stays pinned until the panel commits or discards it', async () => {
  globalThis.OfflineAudioContext = class {
    async decodeAudioData() {
      return {
        duration: 0.01,
        length: 4,
        sampleRate: 48000,
        numberOfChannels: 1,
        getChannelData: () => new Float32Array([0, 1, 0, 0]),
      };
    }
  };
  const sample = await importSample({
    name: 'test.wav',
    size: 4,
    arrayBuffer: async () => new ArrayBuffer(4),
  });
  await pruneSamples(new Set());
  assert.ok(await getSample(sample.id));
  releaseImportedSample(sample.id);
  await pruneSamples(new Set());
  assert.equal(await getSample(sample.id), null);
});

// Deterministic shared/exclusive lock simulation; no real browser or speakers.
class TestLocks {
  holders = [];
  queue = [];
  request(name, options, callback) {
    return new Promise((resolve, reject) => {
      const job = { name, mode: options.mode, callback, resolve, reject };
      if (
        options.ifAvailable &&
        (this.queue.some((queued) => queued.name === name) || !this.available(job))
      ) {
        Promise.resolve(callback(null)).then(resolve, reject);
        return;
      }
      this.queue.push(job);
      this.pump();
    });
  }
  available(job) {
    return !this.holders.some(
      (h) => h.name === job.name && (h.mode === 'exclusive' || job.mode === 'exclusive'),
    );
  }
  pump() {
    for (;;) {
      const index = this.queue.findIndex(
        (job, index) =>
          this.available(job) &&
          !this.queue.slice(0, index).some((previous) => previous.name === job.name),
      );
      if (index < 0) return;
      const [job] = this.queue.splice(index, 1);
      this.holders.push(job);
      Promise.resolve()
        .then(() => job.callback({ name: job.name, mode: job.mode }))
        .then(job.resolve, job.reject)
        .finally(() => {
          this.holders.splice(this.holders.indexOf(job), 1);
          this.pump();
        });
    }
  }
}

test('another open rack protects its undo samples from cleanup', async () => {
  await seed('other-tab-undo');
  const locks = new TestLocks(),
    saved = storage();
  const other = startSampleMaintenance(
    () => [withSample('other-tab-undo')],
    () => saved,
    locks,
  );
  while (!locks.holders.some((h) => h.mode === 'shared')) await tick();
  const current = startSampleMaintenance(
    () => [empty()],
    () => saved,
    locks,
  );
  while (locks.holders.filter((h) => h.mode === 'shared').length < 2) await tick();
  await current.sweep();
  assert.ok(await getSample('other-tab-undo'));
  other.close();
  await tick();
  await current.sweep();
  assert.equal(await getSample('other-tab-undo'), null);
  current.close();
  await tick();
});

test('simultaneous cleanup in two tabs never discards either live undo history', async () => {
  await seed('tab-a', 'tab-b');
  const locks = new TestLocks(),
    saved = storage();
  const a = startSampleMaintenance(
    () => [withSample('tab-a')],
    () => saved,
    locks,
  );
  const b = startSampleMaintenance(
    () => [withSample('tab-b')],
    () => saved,
    locks,
  );
  await Promise.all([a.ready, b.ready]);
  try {
    await Promise.all([a.sweep(), b.sweep()]);
    assert.ok(await getSample('tab-a'));
    assert.ok(await getSample('tab-b'));
  } finally {
    a.close();
    b.close();
  }
});

test('muted welcome startup stays silent and unmuting reuses the running patch', async () => {
  const engine = new AudioEngine();
  engine.setMuted(true);
  await engine.start(empty(), true);
  const context = engine.context,
    node = engine.node;
  assert.equal(context.level, 0);
  assert.equal(context.resumed, true);
  engine.setMuted(false);
  assert.equal(context.level, 1);
  engine.setMuted(true);
  assert.equal(context.level, 0);
  assert.equal(context.resumed, true, 'mute does not pause transport');
  assert.equal(engine.node, node, 'mute does not recreate the instrument');
  await engine.close();
});

test('blocked autoplay does not hold the welcome UI busy, and a gesture can resume it', async () => {
  const originalResume = FakeContext.prototype.resume;
  FakeContext.prototype.resume = function () {
    return new Promise(() => {});
  };
  const engine = new AudioEngine();
  try {
    engine.setMuted(true);
    await engine.start(empty(), true);
    assert.equal(engine.context.level, 0);
    assert.equal(engine.context.state, 'suspended');
    FakeContext.prototype.resume = originalResume;
    await engine.start(empty());
    assert.equal(engine.context.state, 'running');
    assert.equal(engine.context.level, 0, 'resuming by touching a knob remains silent');
  } finally {
    FakeContext.prototype.resume = originalResume;
    await engine.close();
  }
});
