'use client';
import { Dial, Action, Light } from '@/components/controls/Studio';
import { PanelArtwork, Legend } from '@/components/controls/PanelArtwork';
import { useModule } from '@/components/controls/ModuleControls';
import styles from './panel.module.css';
export default function Panel() {
  const { module, beginEdit, setParam, running, display } = useModule();
  return (
    <>
      <PanelArtwork>
        <rect className="wash" x="17" y="92" width="285" height="102" rx="12" />
        <path
          className="faint"
          d="M38 190V183M55 190V171M72 190V160M89 190V166M106 190V177M123 190V181M140 190V184"
        />
        <path d="M20 304H302M267 216V284" />
      </PanelArtwork>
      <div className={styles.models} role="group" aria-label="Percussion model">
        {['PLUCK', 'BELL', 'WOOD'].map((name, n) => (
          <button
            key={name}
            aria-pressed={Math.round(module.params.model) === n}
            onClick={() => {
              beginEdit();
              setParam('model', n);
            }}
          >
            {name}
          </button>
        ))}
      </div>
      <Dial id="tune" x={64} y={135} large />
      <Dial id="color" x={163} y={135} />
      <Dial id="morph" x={263} y={135} />
      <Dial id="decay" x={52} y={241} />
      <Dial id="strike" x={137} y={241} />
      <Dial id="level" x={221} y={241} />
      <Action event="strike" label="STRIKE" x={66} y={291} />
      <Light
        on={running && Number(display.energy ?? 0) > 0.015}
        x={117}
        y={291}
        label="Tine voice active"
      />
      <Legend x={220} y={291}>
        HARMONIC · MALLET
      </Legend>
    </>
  );
}
