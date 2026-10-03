'use client';
import { useEffect, useState } from 'react';
import { LESSONS, tutorialId } from '@/lib/tutorial';
import type { Patch, ModuleType } from '@/lib/modules';
import type { ProbeTarget, ScopeFrame } from '@/lib/scope';
import { Trace } from '../rack/JackScope';
import { targetLabel } from './navigation';
import styles from './TutorialCoach.module.css';

export function lessonSignal(step: number): ProbeTarget | null {
  const goal = LESSONS[step]?.goal;
  if (!goal) return null;
  const outputs: Partial<Record<ModuleType, string>> = {
    oscillator: 'sine',
    filter: 'low',
    vca: 'out',
    envelope: 'env',
  };
  const type = goal.kind === 'cable' ? goal.from : goal.module;
  const port = goal.kind === 'cable' ? goal.out : outputs[type];
  return port
    ? { id: tutorialId(type), port, direction: 'out', key: `tutorial:${type}:${port}` }
    : null;
}
export function TutorialSignal({
  step,
  frame,
  running,
  patch,
  onProbe,
}: {
  step: number;
  frame: ScopeFrame | null;
  running: boolean;
  patch: Patch;
  onProbe: (target: ProbeTarget | null) => void;
}) {
  const source = lessonSignal(step);
  const [side, setSide] = useState<'source' | 'master'>('source');
  const [time, setTime] = useState<'fast' | 'slow'>(
    ['lfo', 'envelope', 'sequencer'].some((type) => source?.id === `learn-${type}`)
      ? 'slow'
      : 'fast',
  );
  const [expanded, setExpanded] = useState(true);
  useEffect(() => {
    const media = matchMedia('(min-width: 1100px)');
    const resize = () => setExpanded(media.matches);
    resize();
    media.addEventListener('change', resize);
    return () => media.removeEventListener('change', resize);
  }, []);
  if (!source) return null;
  const target =
    side === 'source'
      ? source
      : {
          id: tutorialId('output'),
          port: 'left',
          direction: 'in' as const,
          key: 'tutorial:master',
        };
  const data = frame?.key === target.key ? frame : null;
  const unpatched =
    side === 'master' && !patch.cables.some((c) => c.to === target.id && c.toPort === 'left');
  const label = targetLabel({
    module: source.id.replace('learn-', '') as ModuleType,
    port: source.port,
    direction: 'out',
  });
  const choose = (next: 'source' | 'master') => {
    setSide(next);
    onProbe(
      next === 'source'
        ? source
        : { id: tutorialId('output'), port: 'left', direction: 'in', key: 'tutorial:master' },
    );
  };
  return (
    <section className={styles.signal} aria-label="Signal microscope">
      <header>
        <button
          className={styles.scopeToggle}
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          SIGNAL MICROSCOPE {expanded ? '−' : '+'}
        </button>
        <span>{running ? 'LIVE' : data ? 'PAUSED' : 'EXAMPLES'}</span>
      </header>
      {expanded && (
        <>
          <div className={styles.scopeTabs} aria-label="Observe a jack">
            <button aria-pressed={side === 'source'} onClick={() => choose('source')}>
              {label}
            </button>
            <button aria-pressed={side === 'master'} onClick={() => choose('master')}>
              MASTER IN
            </button>
          </div>
          {!running && !data ? (
            <div
              className={styles.waveExamples}
              aria-label="Illustrations: fast audio voltage and slow control voltage"
            >
              <span>Audio · 20 milliseconds</span>
              <svg viewBox="0 0 230 30" aria-hidden="true">
                <path d="M0 15H230" className={styles.zeroLine} />
                <path
                  d={Array.from(
                    { length: 231 },
                    (_, i) =>
                      `${i ? 'L' : 'M'}${i},${15 - 11 * Math.sin((i / 230) * Math.PI * 10)}`,
                  ).join(' ')}
                />
              </svg>
              <span>Control voltage · 4 seconds</span>
              <svg viewBox="0 0 230 30" aria-hidden="true">
                <path d="M0 15H230" className={styles.zeroLine} />
                <path
                  d={Array.from(
                    { length: 231 },
                    (_, i) => `${i ? 'L' : 'M'}${i},${15 - 11 * Math.sin((i / 230) * Math.PI * 4)}`,
                  ).join(' ')}
                />
              </svg>
            </div>
          ) : (
            <Trace
              trace={
                running && unpatched
                  ? {
                      min: [0, 0],
                      max: [0, 0],
                      seconds: time === 'fast' ? 0.02 : 4,
                      window: time === 'fast' ? 0.02 : 4,
                    }
                  : (data?.[time] ?? null)
              }
              label={time === 'fast' ? '20 ms · see the wave' : '4 s · see the movement'}
              color="#cddd98"
            />
          )}
          <div className={styles.scopeTabs} aria-label="Signal timescale">
            <button aria-pressed={time === 'fast'} onClick={() => setTime('fast')}>
              20 ms
            </button>
            <button aria-pressed={time === 'slow'} onClick={() => setTime('slow')}>
              4 sec
            </button>
            <span>
              {running && unpatched
                ? '0 V · unpatched'
                : data
                  ? `${data.current.toFixed(2)} V`
                  : 'Press Listen to see voltage'}
            </span>
          </div>
          <p>
            {step < 3
              ? 'Fast wave → tone. Slow wave → movement. Both are voltage. Compare ORBIT and MASTER IN.'
              : source.id === tutorialId('lfo')
                ? 'Same kind of voltage, slower wave. At a CV input it moves a control; at an audio input it becomes part of the sound.'
                : 'A cable carries voltage. The input decides what that voltage does.'}
          </p>
        </>
      )}
    </section>
  );
}
