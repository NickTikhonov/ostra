'use client';
import type { ScopeFrame } from '@/lib/scope';
import styles from './TutorialCoach.module.css';

/** A fixed view of the actual signal selected by the lesson. No scope controls. */
export function TutorialWaveform({
  frame,
  running,
  probeKey,
  label,
  time,
  unipolar,
}: {
  frame: ScopeFrame | null;
  running: boolean;
  probeKey: string;
  label: string;
  time: 'fast' | 'slow';
  unipolar: boolean;
}) {
  const trace = frame?.key === probeKey ? frame[time] : null;
  const limit = Math.max(
    5,
    ...(trace?.min ?? []).map(Math.abs),
    ...(trace?.max ?? []).map(Math.abs),
  );
  const path = trace?.min
    .map((v, i) => {
      const filled = Math.min(1, trace.seconds / trace.window);
      const x = 8 + (1 - filled + (filled * i) / Math.max(1, trace.min.length - 1)) * 304;
      const y = (unipolar ? 108 : 60) - ((v + trace.max[i]) / 2 / limit) * (unipolar ? 90 : 46);
      return `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  return (
    <figure
      className={styles.waveform}
      aria-label={unipolar ? label : 'Oscilloscope: signal at the master output'}
    >
      <figcaption>
        {label} <span>{!running ? 'Paused' : ''}</span>
      </figcaption>
      <svg
        viewBox="0 0 320 120"
        role="img"
        aria-label={unipolar ? 'Control voltage over time' : 'Shape of the voltage oscillation'}
      >
        <path d={unipolar ? 'M8 108H312' : 'M8 60H312'} className={styles.waveformZero} />
        {path && <path d={path} className={styles.waveformLine} />}
      </svg>
      {!trace && (
        <span className={styles.waveformHint}>
          {running
            ? 'Waiting for signal…'
            : unipolar
              ? 'Press Listen to see the signal'
              : 'Press Listen to see the oscillation'}
        </span>
      )}
    </figure>
  );
}
