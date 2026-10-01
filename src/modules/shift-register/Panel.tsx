'use client';
import { Dial, Action, Light } from '@/components/controls/Studio';
import { PanelArtwork, Legend } from '@/components/controls/PanelArtwork';
import { useModule } from '@/components/controls/ModuleControls';
export default function Panel() {
  const { display, running } = useModule();
  return (
    <>
      <PanelArtwork>
        <path d="M60 85H79V74H215M207 84V322" />
        {[136, 198, 260, 322].map((y) => (
          <path key={y} d={`M207 ${y}H219M203 ${y - 13}L207 ${y - 8}L211 ${y - 13}`} />
        ))}
      </PanelArtwork>
      <Dial id="tap" x={139} y={125} large />
      <Legend x={137} y={67}>
        CLOCKS BEHIND
      </Legend>
      <Action event="step" label="SHIFT" x={138} y={224} />
      <Action event="clear" label="CLEAR" x={138} y={259} />
      {[0, 1, 2, 3, 4].map((n) => (
        <Light
          key={n}
          on={running && Math.abs(Number(display[n ? 'tap' + n : 'now'] ?? 0)) > 0.01}
          x={218}
          y={74 + n * 62}
        />
      ))}
    </>
  );
}
