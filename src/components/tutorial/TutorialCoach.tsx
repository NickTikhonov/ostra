'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import {
  LESSONS,
  activeLessonGoal,
  lessonTargets,
  targetSelector,
  type Target,
} from '@/lib/tutorial';
import type { Patch } from '@/lib/modules';
import type { ScopeFrame } from '@/lib/scope';
import { lessonScope, lessonSignal } from '@/lib/tutorial-scope';
import { TutorialWaveform } from './TutorialWaveform';
import { revealTargets, revealLesson, targetLabel } from './navigation';
import styles from './TutorialCoach.module.css';

export function TutorialCoach({
  step,
  complete,
  running,
  busy,
  onListen,
  onNext,
  onBack,
  onReset,
  onSolve,
  onExplore,
  patch,
  frame,
}: {
  step: number;
  complete: boolean;
  running: boolean;
  busy: boolean;
  onListen: () => void;
  onNext: () => void;
  onBack: () => void;
  onReset: () => void;
  onSolve: () => void;
  onExplore: () => void;
  patch: Patch;
  frame: ScopeFrame | null;
}) {
  const lesson = LESSONS[step],
    title = useRef<HTMLHeadingElement>(null);
  const scope = lessonScope(step);
  const goal = activeLessonGoal(patch, step);
  const sequence = lesson?.goal.kind === 'cable' && !!lesson.goal.then;
  const secondConnection = sequence && goal !== lesson.goal;
  const container = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = container.current;
    const rack = element?.closest<HTMLElement>('.rack-app');
    if (!element || !rack) return;
    const measure = () =>
      rack.style.setProperty(
        '--tutorial-height',
        `${element.getBoundingClientRect().height + 30}px`,
      );
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => {
      observer.disconnect();
      rack.style.removeProperty('--tutorial-height');
    };
  }, []);
  useEffect(() => {
    container.current?.scrollTo({ top: 0 });
    title.current?.focus({ preventScroll: true });
  }, [step]);
  return (
    <aside ref={container} className={styles.coach} aria-label="Modular tutorial">
      <div
        className={styles.progress}
        aria-label={`${Math.min(step + 1, LESSONS.length)} of ${LESSONS.length} lessons`}
      >
        {LESSONS.map((l, i) => (
          <span key={l.title} data-state={i < step ? 'done' : i === step ? 'current' : 'future'} />
        ))}
      </div>
      <div className={styles.topline}>
        <span className={styles.eyebrow}>
          {lesson
            ? `${String(step + 1).padStart(2, '0')} / ${LESSONS.length} · ${lesson.chapter}`
            : 'FIRST PATCH · COMPLETE'}
        </span>
        <Link href="/" className={styles.exit}>
          <ArrowLeft size={12} /> My rack <span>· kept safe</span>
        </Link>
      </div>
      {lesson ? (
        <>
          <div
            className={`${styles.columns} ${styles.firstStep} ${scope ? styles.withWaveform : ''}`}
          >
            <div className={styles.lesson}>
              <h2 ref={title} tabIndex={-1}>
                {lesson.title}
              </h2>
              {lesson.explain.split('\n\n').map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className={styles.task}>
              <span className={styles.taskLabel}>
                {complete ? (
                  <>
                    <Check size={14} /> YOU GOT IT
                  </>
                ) : (
                  <>
                    <span className={styles.dot} />{' '}
                    {sequence ? `CONNECTION ${secondConnection ? 2 : 1} OF 2` : 'YOUR TURN'}
                  </>
                )}
              </span>
              <p>
                {step === 0 && complete
                  ? running
                    ? 'You’re hearing your first patch.'
                    : 'Press Listen to hear your first patch.'
                  : goal?.kind === 'cable' && goal.action
                    ? goal.action
                    : !running && lesson.actionPaused
                      ? lesson.actionPaused
                      : lesson.action}
              </p>
              {complete && (
                <div className={styles.feedback} role="status">
                  {lesson.discovery}
                </div>
              )}
            </div>
            {scope && (
              <TutorialWaveform
                {...scope}
                frame={frame}
                running={running}
                probeKey={lessonSignal(step, patch)!.key}
              />
            )}
          </div>
          <div className={styles.actions}>
            <button
              className={styles.secondary}
              onClick={onBack}
              disabled={busy}
              aria-label={step === 0 ? 'Introduction' : 'Previous lesson'}
            >
              <ArrowLeft size={14} /> {step === 0 ? 'Introduction' : 'Back'}
            </button>
            <button className={styles.textButton} onClick={onReset} disabled={busy}>
              <RotateCcw size={12} /> Reset
            </button>
            {!complete && (
              <button className={styles.textButton} onClick={onSolve} disabled={busy}>
                <Sparkles size={12} /> Do it for me
              </button>
            )}
            <span className={styles.spacer} />
            <button
              className={`${styles.listenButton} ${running ? styles.playing : ''}`}
              onClick={onListen}
              disabled={busy || (step === 0 && !complete)}
              aria-label={running ? 'Pause tutorial audio' : 'Listen to the patch'}
            >
              {running ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
              {running ? 'Pause' : 'Listen'}
            </button>
            <button className={styles.next} onClick={onNext} disabled={!complete || busy}>
              {step === LESSONS.length - 1 ? 'Finish patch' : 'Continue'}
              <ArrowRight size={15} />
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 ref={title} tabIndex={-1}>
            You built your first instrument.
          </h2>
          <p className={styles.finishText}>
            You started with one oscillator and connected the controls that give it tone, volume,
            rhythm and melody. Now you can change the instrument yourself: try a new sequence,
            reshape the envelope, or move a control cable to another input.
          </p>
          <p className={styles.finishText}>
            Keep exploring opens this patch for you to add modules and experiment. Your tutorial
            patch is saved separately from your main rack.
          </p>
          <div className={styles.actions}>
            <button className={styles.textButton} onClick={onReset} disabled={busy}>
              <RotateCcw size={12} /> Start again
            </button>
            <span className={styles.spacer} />
            <button className={styles.listenButton} onClick={onListen} disabled={busy}>
              {running ? <Pause size={14} /> : <Play size={14} />} {running ? 'Pause' : 'Listen'}
            </button>
            <button className={styles.next} onClick={onExplore}>
              Keep exploring
              <ArrowRight size={15} />
            </button>
          </div>
        </>
      )}
    </aside>
  );
}

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  target: Target;
  edge?: string;
};
export function TutorialHighlights({
  step,
  complete,
  patch,
  pending,
  revision,
}: {
  step: number;
  complete: boolean;
  patch: Patch;
  pending: boolean;
  revision: number;
}) {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const targetKey = JSON.stringify(lessonTargets(step, patch));
  useEffect(() => {
    // Wait for the coach to measure itself before framing the working area.
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => revealLesson(step, patch));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [step, revision, targetKey]);
  useEffect(() => {
    if (complete) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const viewport = document.querySelector('.canvas-viewport')?.getBoundingClientRect();
        if (!viewport) return;
        const targets = lessonTargets(step, patch);
        setBoxes(
          targets.flatMap((target: Target, index) => {
            const element = document.querySelector(targetSelector(target));
            if (!element) return [];
            const r = element.getBoundingClientRect();
            const top = target.module === 'output' ? 0 : viewport.top;
            const bottom = target.module === 'output' ? innerHeight : viewport.bottom;
            const edge =
              r.left < 12
                ? '←'
                : r.right > innerWidth - 12
                  ? '→'
                  : r.top < top
                    ? '↑'
                    : r.bottom > bottom
                      ? '↓'
                      : undefined;
            return [
              {
                x: edge ? Math.max(12, Math.min(innerWidth - 204, r.x)) : r.x,
                y: edge
                  ? Math.max(viewport.top + 12, Math.min(viewport.bottom - 48 - index * 44, r.y))
                  : r.y,
                width: r.width,
                height: r.height,
                index,
                target,
                edge,
              },
            ];
          }),
        );
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    const viewport = document.querySelector('.canvas-viewport');
    if (viewport) observer.observe(viewport);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step, complete, patch]);
  if (complete) return null;
  return (
    <div className={styles.highlights}>
      {boxes.map((b) =>
        b.edge ? (
          <button
            key={b.index}
            className={styles.edgeTarget}
            style={{ left: b.x, top: b.y }}
            onClick={() => revealTargets([b.target])}
          >
            <strong>
              {b.edge} {b.index + 1} · {targetLabel(b.target)}
            </strong>
            <small>{pending ? 'Bring cable here' : 'Offscreen · show me'}</small>
          </button>
        ) : (
          <div
            aria-hidden="true"
            key={b.index}
            className={styles.halo}
            style={{ left: b.x - 6, top: b.y - 6, width: b.width + 12, height: b.height + 12 }}
          >
            <span>{b.index + 1}</span>
          </div>
        ),
      )}
    </div>
  );
}
