/** Stereo, little-endian 16-bit PCM; chunks already arrive interleaved from the worklet. */
export function recordingWav(chunks: ArrayBuffer[], sampleRate: number): Blob {
  const bytes = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const header = new ArrayBuffer(44),
    view = new DataView(header);
  const text = (offset: number, value: string) => {
    for (let n = 0; n < value.length; n++) view.setUint8(offset + n, value.charCodeAt(n));
  };
  text(0, 'RIFF');
  view.setUint32(4, bytes + 36, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, bytes, true);
  return new Blob([header, ...chunks], { type: 'audio/wav' });
}
