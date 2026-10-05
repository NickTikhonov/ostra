import type { CSSProperties, ReactNode } from 'react';
import '@fontsource/kalam/latin-400.css';
import styles from './StickyNote.module.css';

/** A passive annotation in its parent's coordinate plane. It never captures input. */
export function StickyNote({
  id,
  x,
  y,
  width = 210,
  height = 138,
  rotation = -3,
  scale = 1,
  faded = false,
  label,
  children,
}: {
  id?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  scale?: number;
  faded?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <aside
      id={id}
      role="note"
      aria-label={label}
      className={styles.note}
      data-faded={faded || undefined}
      style={
        {
          left: x,
          top: y,
          width,
          height,
          '--note-angle': `${rotation}deg`,
          '--note-scale': scale,
        } as CSSProperties
      }
    >
      <div className={styles.paper}>
        <span className={styles.label}>{label}</span>
        <p>{children}</p>
      </div>
    </aside>
  );
}
