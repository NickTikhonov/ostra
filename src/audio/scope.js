// One selected jack is sampled at a time. The long trace keeps min/max buckets,
// so short gates and audio peaks survive decimation without allocating per sample.
export class VoltageProbe {
  /** @param {number} sampleRate */
  constructor(sampleRate) {
    this.sampleRate = sampleRate;
    this.low = new Float32Array(256);
    this.high = new Float32Array(256);
    this.samples = new Float32Array(Math.ceil(sampleRate * 0.06));
    this.sampleWrite = 0;
    this.sampleCount = 0;
    this.slowWrite = 0;
    this.slowCount = 0;
    this.bucketCount = 0;
    this.bucketMin = Infinity;
    this.bucketMax = -Infinity;
    this.current = 0;
    this.stride = Math.ceil((sampleRate * 4) / 256);
    this.reset();
  }
  reset() {
    this.sampleWrite = 0;
    this.sampleCount = 0;
    this.slowWrite = 0;
    this.slowCount = 0;
    this.bucketCount = 0;
    this.bucketMin = Infinity;
    this.bucketMax = -Infinity;
    this.current = 0;
  }
  /** @param {number} value */
  capture(value) {
    const v = Number.isFinite(value) ? value : 0;
    this.current = v;
    this.samples[this.sampleWrite] = v;
    this.sampleWrite = (this.sampleWrite + 1) % this.samples.length;
    this.sampleCount = Math.min(this.samples.length, this.sampleCount + 1);
    this.bucketMin = Math.min(this.bucketMin, v);
    this.bucketMax = Math.max(this.bucketMax, v);
    if (++this.bucketCount >= this.stride) {
      this.low[this.slowWrite] = this.bucketMin;
      this.high[this.slowWrite] = this.bucketMax;
      this.slowWrite = (this.slowWrite + 1) % 256;
      this.slowCount = Math.min(256, this.slowCount + 1);
      this.bucketCount = 0;
      this.bucketMin = Infinity;
      this.bucketMax = -Infinity;
    }
  }
  /** @param {string} key */
  frame(key) {
    if (!this.slowCount && !this.bucketCount) return null;
    const slowMin = [],
      slowMax = [],
      complete = Math.min(this.slowCount, this.bucketCount ? 255 : 256);
    for (let n = 0; n < complete; n++) {
      const at = (this.slowWrite - complete + n + 256) % 256;
      slowMin.push(this.low[at]);
      slowMax.push(this.high[at]);
    }
    if (this.bucketCount) {
      slowMin.push(this.bucketMin);
      slowMax.push(this.bucketMax);
    }
    // Trigger on a rising zero crossing so periodic audio remains readable.
    const span = Math.min(this.sampleCount, Math.floor(this.sampleRate * 0.02));
    const oldest =
      (this.sampleWrite - this.sampleCount + this.samples.length) % this.samples.length;
    const at = (/** @type {number} */ i) => this.samples[(oldest + i) % this.samples.length];
    let start = this.sampleCount - span;
    for (let i = start; i > Math.max(0, start - span); i--) {
      if (at(i - 1) <= 0 && at(i) > 0) {
        start = i;
        break;
      }
    }
    const fastMin = [],
      fastMax = [];
    for (let bin = 0; bin < Math.min(256, span); bin++) {
      const from = Math.floor((bin * span) / Math.min(256, span));
      const to = Math.floor(((bin + 1) * span) / Math.min(256, span));
      let low = Infinity,
        high = -Infinity;
      for (let i = from; i < to; i++) {
        low = Math.min(low, at(start + i));
        high = Math.max(high, at(start + i));
      }
      fastMin.push(low);
      fastMax.push(high);
    }
    return {
      key,
      current: this.current,
      fast: { min: fastMin, max: fastMax, seconds: span / this.sampleRate, window: 0.02 },
      slow: {
        min: slowMin,
        max: slowMax,
        seconds: (complete * this.stride + this.bucketCount) / this.sampleRate,
        window: (256 * this.stride) / this.sampleRate,
      },
    };
  }
}
