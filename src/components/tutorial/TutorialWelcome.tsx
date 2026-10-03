'use client';
import { ArrowRight, Pause, Play } from 'lucide-react';
import Link from 'next/link';
import styles from './TutorialWelcome.module.css';

export function TutorialWelcome({
  running,
  busy,
  onListen,
  onBegin,
}: {
  running: boolean;
  busy: boolean;
  onListen: () => void;
  onBegin: () => void;
}) {
  return (
    <section className={styles.welcome} aria-label="Introduction to modular synthesis">
      <div className={styles.masthead}>
        <span>
          ostra <small>A FIRST PATCH</small>
        </span>
        <Link href="/">My rack →</Link>
      </div>
      <div className={styles.content}>
        <div>
          <p className={styles.eyebrow}>BUILD THE INSTRUMENT. THEN LET IT SURPRISE YOU.</p>
          <h1>
            Program your own
            <br /> <em>musical instrument.</em>
          </h1>
          <p className={styles.intro}>
            That’s the idea behind modular synthesisers. Each module does a job. You choose how they
            connect—and what happens next.
          </p>
        </div>
        <div className={styles.invitation}>
          <div className={styles.patchName}>
            <span className={running ? styles.live : ''} /> GLASS GARDEN{' '}
            <small>GENERATIVE PATCH</small>
          </div>
          <p>
            Three rhythms weave around each other. Pitches wander, bells change colour, echoes leave
            a trail. This instrument plays itself.
          </p>
          <div className={styles.actions}>
            <button
              className={styles.play}
              disabled={busy}
              onClick={onListen}
              aria-pressed={running}
            >
              {running ? (
                <Pause size={17} fill="currentColor" />
              ) : (
                <Play size={17} fill="currentColor" />
              )}
              {running ? 'Pause this patch' : 'Play this patch'}
            </button>
            <button className={styles.begin} disabled={busy} onClick={onBegin}>
              Start from scratch <ArrowRight size={15} />
            </button>
          </div>
          <p className={styles.next}>
            Next, we’ll build a patch from scratch—one connection at a time. No experience needed.
          </p>
        </div>
      </div>
      <div className={styles.caption}>
        <span>
          {running
            ? 'LIVE · THE PATCH BELOW IS MAKING THE SOUND'
            : '11 MODULES · 26 CONNECTIONS · ONE INSTRUMENT'}
        </span>
        <span>RHYTHM → CHANCE → MEMORY → SOUND → SPACE</span>
      </div>
    </section>
  );
}
