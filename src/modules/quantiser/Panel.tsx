'use client';
import type { CSSProperties } from 'react';
import { Dial, Choice } from '@/components/controls/Studio';
import { PanelArtwork } from '@/components/controls/PanelArtwork';
import { useModule } from '@/components/controls/ModuleControls';
import { CHANNELS, NOTES, SCALES, pitchClass, scaleMask } from './data.js';
import styles from './panel.module.css';
const naturals = [0, 2, 4, 5, 7, 9, 11],
  accidentals = [1, 3, 6, 8, 10],
  accidentalPositions = [1, 2, 4, 5, 6];
export default function Panel() {
  const { module, display, running, beginEdit, setParam, setData } = useModule();
  const mask = scaleMask(module.data, module.params),
    custom = typeof module.data.noteMask === 'number';
  const held = CHANNELS.map((_, n) =>
    running && display[`active${n}`] === true ? Number(display[`note${n}`]) : null,
  );
  function toggle(note: number) {
    const next = mask ^ (1 << note);
    if (!next) return;
    const root = Math.round(module.params.root);
    beginEdit();
    setData({ ...module.data, noteMask: ((next >> root) | (next << (12 - root))) & 4095 });
  }
  function key(note: number, accidental: boolean, index: number) {
    const allowed = !!(mask & (1 << note)),
      voices = held.map((n) => n !== null && pitchClass(n) === note);
    const sounding = voices.some(Boolean),
      flash = voices.some((v, n) => v && display[`flash${n}`]);
    return (
      <button
        key={note}
        className={`${styles.key} ${accidental ? styles.accidental : styles.natural}`}
        style={{
          left: accidental
            ? `${(accidentalPositions[index] * 100) / 7}%`
            : `${((index + 0.5) * 100) / 7}%`,
        }}
        data-enabled={allowed}
        data-sounding={sounding}
        data-flash={flash}
        aria-label={`Scale note ${NOTES[note]}`}
        aria-pressed={allowed}
        aria-disabled={allowed && mask === 1 << note}
        aria-description={
          allowed && mask === 1 << note
            ? 'Keep at least one note in the scale.'
            : 'Toggle this note for all four channels.'
        }
        onClick={() => toggle(note)}
      >
        <span className={styles.noteLight} />
        <span>{NOTES[note]}</span>
        <span className={styles.voices} aria-hidden="true">
          {CHANNELS.map((c, n) => (
            <i key={c.name} style={{ background: c.color, opacity: voices[n] ? 1 : 0 }} />
          ))}
        </span>
      </button>
    );
  }
  return (
    <>
      <div className={styles.noteButtons} role="group" aria-label="Shared scale note buttons">
        {naturals.map((n, i) => key(n, false, i))}
        {accidentals.map((n, i) => key(n, true, i))}
      </div>
      <div className={styles.preset}>
        <span>SCALE</span>
        <button
          aria-label={`Scale preset: ${custom ? 'Custom' : SCALES[module.params.scale]}`}
          onClick={() => {
            beginEdit();
            if (!custom) setParam('scale', (module.params.scale + 1) % SCALES.length);
            setData({ ...module.data, noteMask: null });
          }}
        >
          {custom ? 'CUSTOM' : SCALES[module.params.scale]} <i>{custom ? '↺' : '↔'}</i>
        </button>
      </div>
      <Choice id="root" options={NOTES} x={204} y={183} />
      <Dial id="octave" x={294} y={178} />
      <PanelArtwork>
        {CHANNELS.map((c, n) => (
          <g key={c.name}>
            <rect className="wash" x={14 + n * 100} y="218" width="88" height="141" rx="8" />
            <path d={`M${35 + n * 100} 282V301M${81 + n * 100} 282V301`} />
          </g>
        ))}
      </PanelArtwork>
      {CHANNELS.map((c, n) => {
        const note = held[n];
        return (
          <div
            key={c.name}
            className={styles.channel}
            style={{ left: 58 + n * 100, '--voice-color': c.color } as CSSProperties}
          >
            <span className={styles.channelName}>{c.name}</span>
            <span className={styles.reading} aria-label={`Channel ${c.name} quantised note`}>
              {note === null ? '—' : `${NOTES[pitchClass(note)]}${4 + Math.floor(note / 12)}`}
            </span>
          </div>
        );
      })}
    </>
  );
}
