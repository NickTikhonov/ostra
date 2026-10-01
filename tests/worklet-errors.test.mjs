import test from 'node:test';
import assert from 'node:assert/strict';
let Processor;
globalThis.sampleRate = 48000;
globalThis.AudioWorkletProcessor = class {
  port = {
    messages: [],
    postMessage(message) {
      this.messages.push(message);
    },
  };
};
globalThis.registerProcessor = (_name, processor) => {
  Processor = processor;
};
await import('../src/audio/worklet.js');

test('a thrown processor silences the complete block and reports a single actionable failure', () => {
  const worklet = new Processor();
  worklet.engine.registry = {
    broken: {
      definition: { params: [], inputs: [], outputs: [] },
      processor: {
        createState: () => ({}),
        process() {
          throw new Error('bad sample');
        },
      },
    },
  };
  worklet.engine.setPatch({ modules: [{ id: 'bad-id', type: 'broken', params: {} }], cables: [] });
  const block = [new Float32Array(128).fill(0.5), new Float32Array(128).fill(0.5)];
  assert.equal(worklet.process([], [block]), true);
  assert.ok(block.every((c) => c.every((v) => v === 0)));
  const error = worklet.port.messages.find((m) => m.type === 'error');
  assert.match(error.message, /broken \(bad-id\): bad sample/);
  worklet.process([], [block]);
  assert.equal(worklet.port.messages.filter((m) => m.type === 'error').length, 1);
});

test('initialization, event and display exceptions are reported rather than escaping', () => {
  for (const phase of ['createState', 'onEvent', 'getDisplayState']) {
    const worklet = new Processor(),
      processor = {
        createState: () => ({}),
        process() {},
        onEvent() {},
        getDisplayState: () => ({}),
      };
    processor[phase] = () => {
      throw new Error(phase);
    };
    worklet.engine.registry = {
      broken: { definition: { params: [], inputs: [], outputs: [] }, processor },
    };
    assert.doesNotThrow(() =>
      worklet.port.onmessage({
        data: {
          type: 'patch',
          patch: { modules: [{ id: 'bad', type: 'broken', params: {} }], cables: [] },
        },
      }),
    );
    if (phase === 'onEvent')
      worklet.port.onmessage({ data: { type: 'event', id: 'bad', event: 'go' } });
    if (phase === 'getDisplayState') {
      worklet.frames = 48000;
      worklet.process([], [[new Float32Array(128), new Float32Array(128)]]);
    }
    assert.equal(worklet.failed, true);
    assert.match(worklet.port.messages.find((m) => m.type === 'error').message, new RegExp(phase));
  }
});
