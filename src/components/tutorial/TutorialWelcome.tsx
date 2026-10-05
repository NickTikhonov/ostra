'use client';
import { Play, Volume2 } from 'lucide-react';
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
        <div className={styles.identity}>
          <span className={styles.wordmark}>ostra</span>
          <span>Learn</span>
        </div>
        <Link href="/">My rack</Link>
      </div>
      <div className={styles.content}>
        <div className={styles.lesson}>
          <h1>Learn modular synthesis.</h1>
          <p>Build your own modular sequence from scratch in 15 minutes.</p>
          <div className={styles.lessonAction}>
            <button className={styles.begin} disabled={busy} onClick={onBegin}>
              Start the first lesson
            </button>
            <span>No experience needed.</span>
          </div>
        </div>
        <div className={styles.example}>
          <h2>Glass Garden</h2>
          <p>
            This patch plays itself. Press Listen, then turn <strong>DECAY</strong> on the leftmost{' '}
            <strong>TINE</strong> to change how long the bells ring.
          </p>
          <div className={styles.exampleAction}>
            <button
              className={styles.play}
              disabled={busy}
              onClick={onListen}
              aria-pressed={!muted}
              aria-label={muted ? 'Listen to Glass Garden' : 'Mute Glass Garden'}
            >
              {muted ? (
                <Play size={14} fill="currentColor" aria-hidden="true" />
              ) : (
                <Volume2 size={16} aria-hidden="true" />
              )}
              {muted ? 'Listen to the patch' : 'Mute the patch'}
            </button>
            <span role="status">
              {busy ? 'Starting…' : muted ? 'Sound off' : running ? 'Sound on' : 'Audio paused'}
            </span>
          </div>
        </div>
      </div>
      <p className={styles.mobileHint}>Swipe across the rack to see the other modules.</p>
    </section>
  );
}
