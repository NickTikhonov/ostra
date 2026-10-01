// @ts-check
export const NOTES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const SCALES = [
  'CHROMATIC',
  'MAJOR',
  'MINOR',
  'PENTATONIC',
  'DORIAN',
  'WHOLE TONE',
  'FIFTHS',
];
export const SCALE_MASKS = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  [0, 2, 4, 5, 7, 9, 11],
  [0, 2, 3, 5, 7, 8, 10],
  [0, 2, 4, 7, 9],
  [0, 2, 3, 5, 7, 9, 10],
  [0, 2, 4, 6, 8, 10],
  [0, 7],
].map((notes) => notes.reduce((mask, n) => mask | (1 << n), 0));
// Channel A keeps the original port IDs, preserving old patches.
export const CHANNELS = [
  { name: 'A', pitch: 'pitch', trigger: 'trigger', color: '#dc824e' },
  { name: 'B', pitch: 'pitch2', trigger: 'trigger2', color: '#49adab' },
  { name: 'C', pitch: 'pitch3', trigger: 'trigger3', color: '#9e8cda' },
  { name: 'D', pitch: 'pitch4', trigger: 'trigger4', color: '#d9b94e' },
];
/** @typedef {{noteMask:number|null}} QuantiserData */
/** @returns {QuantiserData} */
export function createData() {
  return { noteMask: null };
}
/** @param {Record<string, unknown>} saved @returns {QuantiserData} */
export function restoreData(saved) {
  const data = /** @type {Record<string,unknown>|undefined} */ (saved.data);
  const mask = data?.noteMask;
  return {
    noteMask:
      typeof mask === 'number' && Number.isInteger(mask) && mask > 0 && mask <= 4095 ? mask : null,
  };
}
/** @param {number} note */
export const pitchClass = (note) => ((note % 12) + 12) % 12;
/** The custom mask is relative to ROOT, so changing root transposes the whole scale.
 * @param {Record<string, import('../types').JsonValue>} data @param {Record<string,number>} params */
export function scaleMask(data, params) {
  const base =
    typeof data.noteMask === 'number' &&
    Number.isInteger(data.noteMask) &&
    data.noteMask > 0 &&
    data.noteMask <= 4095
      ? data.noteMask
      : (SCALE_MASKS[Math.round(params.scale)] ?? SCALE_MASKS[1]);
  const root = pitchClass(Math.round(params.root));
  return ((base << root) | (base >> (12 - root))) & 4095;
}
