// @ts-check
/** @typedef {{type: 'recording-chunk', chunk: ArrayBuffer, frames: number} | {type: 'recording-done', reason: string}} RecordingMessage */
// Capture the bounded stereo master in batches, never message per audio sample.
export class WavRecorder {
  /** @param {number} sampleRate @param {(message: RecordingMessage, transfer?: ArrayBuffer[]) => void} send */
  constructor(sampleRate, send) {
    this.send = send;
    this.limit = Math.min(sampleRate * 600, Math.floor((64 * 1024 * 1024) / 4));
    this.active = false;
    this.frames = 0;
    this.used = 0;
    this.buffer = new ArrayBuffer(16384 * 4);
    this.view = new DataView(this.buffer);
  }
  start() {
    if (this.active) return;
    this.frames = this.used = 0;
    this.active = true;
  }
  /** @param {Float32Array} left @param {Float32Array} right */
  capture(left, right) {
    if (!this.active) return;
    for (let i = 0; i < left.length && this.active; i++) {
      for (let channel = 0; channel < 2; channel++) {
        const value = channel === 0 ? left[i] : right[i];
        const v = Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;
        this.view.setInt16(this.used, Math.round(v * (v < 0 ? 32768 : 32767)), true);
        this.used += 2;
      }
      this.frames++;
      if (this.used === this.buffer.byteLength) this.flush();
      if (this.frames >= this.limit) this.stop('limit');
    }
  }
  flush() {
    if (!this.used) return;
    const chunk =
      this.used === this.buffer.byteLength ? this.buffer : this.buffer.slice(0, this.used);
    this.send({ type: 'recording-chunk', chunk, frames: this.frames }, [chunk]);
    this.buffer = new ArrayBuffer(16384 * 4);
    this.view = new DataView(this.buffer);
    this.used = 0;
  }
  /** @param {string} reason */
  stop(reason = 'stopped') {
    if (!this.active) return;
    this.active = false;
    this.flush();
    this.send({ type: 'recording-done', reason });
  }
}
