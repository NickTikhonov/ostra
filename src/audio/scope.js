// One selected jack is sampled at a time. The long trace keeps min/max buckets,
// so short gates and audio peaks survive decimation without allocating per sample.
export class VoltageProbe {
  /** @param {number} sampleRate */
  constructor(sampleRate) {
    this.sampleRate = sampleRate;
    this.low = new Float32Array(256);
    this.high = new Float32Array(256);
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
    return {
      key,
      current: this.current,
      slow: {
        min: slowMin,
        max: slowMax,
        seconds: (complete * this.stride + this.bucketCount) / this.sampleRate,
        window: (256 * this.stride) / this.sampleRate,
      },
    };
  }
}
