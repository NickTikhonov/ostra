'use client';
import { useRef, useState } from 'react';
import styles from './StepSlider.module.css';

/** A voltage stage with separate selection, gate and value controls. */
export function StepSlider({
  index,
  value,
  min,
  max,
  enabled,
  active,
  selected,
  skipped,
  locked,
  inactive,
  onBegin,
  onChange,
  onToggle,
  onSelect,
}: {
  index: number;
  value: number;
  min: number;
  max: number;
  enabled: boolean;
  active: boolean;
  selected: boolean;
  skipped: boolean;
  locked: boolean;
  inactive: boolean;
  onBegin: () => void;
  onChange: (value: number) => void;
  onToggle: () => void;
  onSelect: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const dirty = useRef(false);
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const outside = value < min || value > max;
  const label = `Stage ${index + 1}`;
  function commit() {
    if (dirty.current && draft !== null && draft.trim() !== '' && Number.isFinite(Number(draft)))
      onChange(clamp(Number(draft)));
    dirty.current = false;
    setDraft(null);
  }
  return (
    <div
      className={`${styles.step} ${active ? styles.active : ''} ${inactive ? styles.inactive : ''} ${skipped ? styles.skipped : ''}`}
    >
      <button
        className={styles.gate}
        aria-label={`${label} gate`}
        aria-pressed={enabled}
        onClick={onToggle}
      >
        <i data-enabled={enabled} />
      </button>
      <button
        className={styles.select}
        aria-label={`Edit ${label.toLowerCase()}${locked ? ', voltage locked' : ''}${skipped ? ', skipped' : ''}`}
        aria-pressed={selected}
        onClick={onSelect}
      >
        {index + 1}
        <span>{locked ? '•' : skipped ? '−' : ''}</span>
      </button>
      <input
        className={styles.slider}
        aria-label={`${label} voltage`}
        aria-valuetext={`${value.toFixed(3)} volts${outside ? ', outside editing range' : ''}`}
        type="range"
        min={min}
        max={max}
        step="any"
        value={clamp(value)}
        onPointerDown={onBegin}
        onKeyDown={(e) => {
          if (
            ![
              'ArrowUp',
              'ArrowRight',
              'ArrowDown',
              'ArrowLeft',
              'Home',
              'End',
              'PageUp',
              'PageDown',
            ].includes(e.key)
          )
            return;
          e.preventDefault();
          onBegin();
          const amount = e.shiftKey ? 0.001 : e.key.startsWith('Page') ? (max - min) / 10 : 0.01;
          onChange(
            clamp(
              e.key === 'Home'
                ? min
                : e.key === 'End'
                  ? max
                  : value +
                    (['ArrowUp', 'ArrowRight', 'PageUp'].includes(e.key) ? amount : -amount),
            ),
          );
        }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <input
        className={styles.value}
        data-outside={outside}
        aria-label={`${label} volts, type to edit`}
        inputMode="decimal"
        value={draft ?? value.toFixed(2)}
        onFocus={() => {
          onBegin();
          dirty.current = false;
          setDraft(String(Number(value.toFixed(4))));
        }}
        onChange={(e) => {
          dirty.current = true;
          setDraft(e.target.value);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            e.preventDefault();
            dirty.current = false;
            setDraft(null);
          }
        }}
      />
    </div>
  );
}
