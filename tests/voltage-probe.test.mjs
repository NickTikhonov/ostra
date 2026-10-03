import test from 'node:test';
import assert from 'node:assert/strict';
import { VoltageProbe } from '../src/audio/scope.js';

for (const sampleRate of [44100, 48000, 96000]) {
  test(`scope resolves audio cycles and preserves slow voltage history at ${sampleRate} Hz`, () => {
    const probe = new VoltageProbe(sampleRate);
    for (let n = 0; n < sampleRate * 5; n++)
      probe.capture(5 * Math.sin((2 * Math.PI * 200 * n) / sampleRate));
    const frame = probe.frame('source');
    assert.equal(frame.key, 'source');
    assert.equal(frame.fast.min.length, 256);
    assert.ok(Math.abs(frame.fast.seconds - 0.02) < 1 / sampleRate);
    const crossings = frame.fast.min.filter((v, i, a) => i && a[i - 1] <= 0 && v > 0).length;
    assert.ok(crossings >= 3 && crossings <= 4, `20 ms shows four 200Hz cycles, got ${crossings}`);
    assert.ok(Math.max(...frame.fast.max) > 4.9);
    assert.ok(Math.min(...frame.fast.min) < -4.9);
    assert.ok(frame.slow.seconds >= 3.9 && frame.slow.seconds < 4.1);
    assert.ok(Math.max(...frame.slow.max) > 4.9);
    probe.reset();
    assert.equal(probe.frame('new'), null);
    probe.capture(NaN);
    const first = probe.frame('new');
    assert.deepEqual(first.fast.min, [0]);
    assert.deepEqual(first.fast.max, [0]);
    assert.equal(first.current, 0);
  });
}
