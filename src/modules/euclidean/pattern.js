// @ts-check
/** Spread hits as evenly as possible; rotation moves the first hit clockwise.
 * Used by the DSP and panel so the displayed rhythm is exactly the played one.
 * @param {number} step @param {number} steps @param {number} hits @param {number} rotation */
export function isHit(step, steps, hits, rotation) {
  const index = (((step - rotation) % steps) + steps) % steps;
  return hits > 0 && (index * Math.min(hits, steps)) % steps < Math.min(hits, steps);
}
