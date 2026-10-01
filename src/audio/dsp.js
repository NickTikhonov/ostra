export const TAU = Math.PI * 2;
/** @param {number} x @param {number} lo @param {number} hi */
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
/** @param {{seed:number}} state */
export function random(state) {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}
/** @param {number} t @param {number} dt */
export function blep(t, dt) {
  if (t < dt) {
    const x = t / dt;
    return x + x - x * x - 1;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt;
    return x * x + x + x + 1;
  }
  return 0;
}
