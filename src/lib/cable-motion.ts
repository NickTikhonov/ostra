export type CablePoint = { x: number; y: number };

const CABLE_MOTION_SPEED = 1.4;
export const CABLE_SETTLE_MS = 1200 / CABLE_MOTION_SPEED;
export const HELD_CABLE_SLACK = 0.22;

/** A damped spring released from rest: drop, rebound, then stop drawing frames. */
export function cableSlack(elapsed: number) {
  if (elapsed >= CABLE_SETTLE_MS) return 1;
  const t = (Math.max(0, elapsed) * CABLE_MOTION_SPEED) / 1000;
  return (
    1 - (1 - HELD_CABLE_SLACK) * Math.exp(-6 * t) * (Math.cos(11 * t) + (6 / 11) * Math.sin(11 * t))
  );
}

export function cableCurve(a: CablePoint, b: CablePoint, slack = 1) {
  const sag = (42 + Math.min(115, Math.abs(a.x - b.x) * 0.17)) * slack;
  return `M${a.x},${a.y} C${a.x},${a.y + sag} ${b.x},${b.y + sag} ${b.x},${b.y}`;
}
