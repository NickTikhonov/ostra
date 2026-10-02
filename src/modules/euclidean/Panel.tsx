'use client';
import { useState, type CSSProperties } from 'react';
import { Dial, Action } from '@/components/controls/Studio';
import { PanelArtwork } from '@/components/controls/PanelArtwork';
import { useModule } from '@/components/controls/ModuleControls';
import { isHit } from './pattern.js';
import { TRACKS } from './tracks.js';
import styles from './panel.module.css';
export default function Panel() {
  const { module, display, running } = useModule();
  const [selected, setSelected] = useState(0);
  const track = TRACKS[selected];
  const patterns = TRACKS.map((keys) => {
    const steps = Math.round(module.params[keys.steps]);
    return {
      steps,
      hits: Math.min(steps, Math.round(module.params[keys.hits])),
      rotation: Math.round(module.params[keys.rotate]) % steps,
      active: running ? Number(display[keys.display] ?? -1) : -1,
    };
  });
  return (
    <>
      <PanelArtwork>
        <rect className="wash" x="14" y="53" width="180" height="178" rx="28" />
        <path d="M216 63V309" />
      </PanelArtwork>
      <svg
        className={styles.rings}
        viewBox="0 0 180 180"
        role="img"
        aria-label={patterns
          .map(
            (p, n) =>
              `Track ${TRACKS[n].label}: ${p.hits} hits in ${p.steps} steps, rotation ${p.rotation}`,
          )
          .join('; ')}
      >
        {TRACKS.map((keys, index) => {
          const { steps, hits, rotation, active } = patterns[index];
          const radius = 78 - index * 19;
          return (
            <g key={keys.label} style={{ '--track-color': keys.color } as CSSProperties}>
              <circle
                cx="90"
                cy="90"
                r={radius}
                className={`${styles.track} ${index === selected ? styles.selectedTrack : ''}`}
              />
              {Array.from({ length: steps }, (_, n) => {
                const angle = (2 * Math.PI * n) / steps - Math.PI / 2;
                return (
                  <circle
                    key={n}
                    cx={90 + radius * Math.cos(angle)}
                    cy={90 + radius * Math.sin(angle)}
                    r={steps > 24 ? 2.5 : 3.5}
                    className={`${styles.step} ${isHit(n, steps, hits, rotation) ? styles.hit : ''} ${n === active ? styles.active : ''}`}
                  />
                );
              })}
            </g>
          );
        })}
        <g style={{ '--track-color': track.color } as CSSProperties}>
          <text x="90" y="72" className={styles.letter}>
            TRACK {track.label}
          </text>
          <text x="90" y="92" className={styles.count}>
            {patterns[selected].hits}/{patterns[selected].steps}
          </text>
        </g>
      </svg>
      <Action event="reset" label="↺ RESET" x={104} y={161} />
      <div className={styles.selectors} role="group" aria-label="Select rhythm track">
        {TRACKS.map((keys, index) => (
          <button
            key={keys.label}
            type="button"
            className={styles.selector}
            style={{ '--track-color': keys.color } as CSSProperties}
            aria-label={`Edit track ${keys.label}`}
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
          >
            {keys.label}
            <span>
              {patterns[index].hits}/{patterns[index].steps}
            </span>
          </button>
        ))}
      </div>
      <div key={selected} role="group" aria-label={`Track ${track.label} controls`}>
        <Dial id={track.steps} x={263} y={83} />
        <Dial id={track.hits} x={263} y={147} />
        <Dial id={track.rotate} x={263} y={210} />
        <Dial id={track.chance} x={263} y={273} />
      </div>
      <Dial id="tempo" x={43} y={273} />
    </>
  );
}
