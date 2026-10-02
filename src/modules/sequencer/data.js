// @ts-check
/**
 * @typedef {Object} SequenceData
 * @property {number[]} steps Voltages, never semitone indices.
 * @property {boolean[]} gates
 * @property {boolean[]} skips
 * @property {boolean[]} locks Protect voltage values from randomisation and mutation.
 * @property {boolean[]} slides Use the global glide time on arrival at this stage.
 * @property {number[]} probabilities Gate probability only; CV always advances.
 * @property {number[]} gateLengths Fraction of a clock interval.
 * @property {number} rangeMin Slider editing range; changing it never rescales stored voltages.
 * @property {number} rangeMax
 * @property {number} addressMode 0: continuous, 1: sampled on clock.
 * @property {number} mutation Fraction of the editing range used by mutation.
 * @property {boolean} legacyClockGate Preserve old external-clock gate timing until explicitly changed.
 */
export const ORDERS = ['Forward', 'Random', 'Reverse', 'Ping-pong', 'Random walk'];
/** @param {number} n @param {number} lo @param {number} hi */
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
/** @returns {SequenceData} */
export function createData() {
  return {
    steps: [0, 7 / 12, 1, 3 / 12, 7 / 12, 10 / 12, 5 / 12, 3 / 12],
    gates: Array(8).fill(true),
    skips: Array(8).fill(false),
    locks: Array(8).fill(false),
    slides: Array(8).fill(true),
    probabilities: Array(8).fill(1),
    gateLengths: Array(8).fill(0.45),
    rangeMin: -10,
    rangeMax: 10,
    addressMode: 0,
    mutation: 0.1,
    legacyClockGate: false,
  };
}
/** @param {unknown} value @param {number} fallback @param {number} lo @param {number} hi */
function number(value, fallback, lo, hi) {
  return typeof value === 'number' && Number.isFinite(value) ? clamp(value, lo, hi) : fallback;
}
/** @param {Record<string, unknown>} saved @returns {SequenceData} */
export function restoreData(saved) {
  const data = /** @type {Record<string, unknown>} */ (
    saved.data && typeof saved.data === 'object' ? saved.data : saved
  );
  // Versionless patches used top-level semitone arrays. v3 stores literal volts.
  const legacy = !(typeof saved.version === 'number' && saved.version >= 3);
  /** @param {string} key @param {boolean} fallback */
  const flags = (key, fallback) =>
    Array.from({ length: 8 }, (_, i) => {
      const values = data[key];
      return Array.isArray(values) && typeof values[i] === 'boolean' ? values[i] : fallback;
    });
  /** @param {string} key @param {number} fallback @param {number} lo @param {number} hi */
  const values = (key, fallback, lo, hi) =>
    Array.from({ length: 8 }, (_, i) => {
      const array = data[key];
      return number(Array.isArray(array) ? array[i] : undefined, fallback, lo, hi);
    });
  const rangeMin = legacy ? -1 : number(data.rangeMin, -10, -10, 9.99);
  const rangeMax = legacy ? 2 : number(data.rangeMax, 10, rangeMin + 0.01, 10);
  return {
    steps: legacy
      ? values('steps', 0, -12, 24).map((n) => Math.round(n) / 12)
      : values('steps', 0, -10, 10),
    gates: flags('gates', true),
    skips: flags('skips', false),
    locks: flags('locks', false),
    slides: flags('slides', true),
    probabilities: values('probabilities', 1, 0, 1),
    gateLengths: values('gateLengths', 0.45, 0.01, 1),
    rangeMin,
    rangeMax,
    addressMode: Math.round(number(data.addressMode, 0, 0, 1)),
    mutation: number(data.mutation, 0.1, 0, 1),
    legacyClockGate: legacy || data.legacyClockGate === true,
  };
}
