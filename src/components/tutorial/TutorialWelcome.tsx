'use client';
import { ArrowRight, Play, Volume2 } from 'lucide-react';
import Link from 'next/link';
import styles from './TutorialWelcome.module.css';

export function TutorialWelcome({
  running,
  muted,
  busy,
  onListen,
  onBegin,
}: {
  running: boolean;
  muted: boolean;
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
          <h1>
            Program your own
            <br /> <em>musical instrument.</em>
          </h1>
          <p className={styles.intro}>
            Modular synthesisers give you a way to connect and process electronic signals to create
            complex and evolving music. Start making music with Ostra with this tutorial.
          </p>
        </div>
        <div className={styles.invitation}>
          <div className={styles.patchName}>
            <span className={running ? styles.live : ''} /> GLASS GARDEN{' '}
            <small>GENERATIVE PATCH</small>
          </div>
          <p>
            A generative modular patch with an evolving polyrhythm, shifting bell tones and warm,
            lingering echoes. Try turning the knobs to make it your own.
          </p>
          <div className={styles.actions}>
            <button
              className={styles.play}
              disabled={busy}
              onClick={onListen}
              aria-pressed={!muted}
              aria-label={muted ? 'Listen to Glass Garden' : 'Mute Glass Garden'}
            >
              {muted ? <Play size={15} fill="currentColor" /> : <Volume2 size={17} />}
              {muted ? 'Listen' : 'Mute'}
            </button>
            <button className={styles.begin} disabled={busy} onClick={onBegin}>
              Learn to patch <ArrowRight size={15} />
            </button>
          </div>
          <p className={styles.next}>
            Next, we’ll build a patch from scratch—one connection at a time. No experience needed.
          </p>
        </div>
      </div>
    </section>
  );
}
