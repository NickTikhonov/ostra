export type NoteBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  scale?: number;
};

/** Include tilted corners, so notes also yield to neighbouring modules they cover. */
export function noteOverlaps(note: NoteBounds, target: Omit<NoteBounds, 'rotation' | 'scale'>) {
  const angle = ((note.rotation ?? 0) * Math.PI) / 180;
  const scale = note.scale ?? 1;
  const width =
    scale * (Math.abs(note.width * Math.cos(angle)) + Math.abs(note.height * Math.sin(angle)));
  const height =
    scale * (Math.abs(note.width * Math.sin(angle)) + Math.abs(note.height * Math.cos(angle)));
  const x = note.x + (note.width - width) / 2;
  const y = note.y + (note.height - height) / 2;
  return (
    x < target.x + target.width &&
    x + width > target.x &&
    y < target.y + target.height &&
    y + height > target.y
  );
}
