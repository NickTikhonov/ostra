'use client';
import { Dial, Action, Light } from '@/components/controls/Studio';
import { PanelArtwork, Legend } from '@/components/controls/PanelArtwork';
import { useModule } from '@/components/controls/ModuleControls';
export default function Panel() {
  const { running, display } = useModule();
  return (
    <>
      <PanelArtwork>
        <rect className="wash" x="14" y="51" width="204" height="153" rx="12" />
        <rect className="wash" x="14" y="207" width="204" height="153" rx="12" />
        <path className="faint" d="M88 127L113 84L144 127M88 283L113 240L144 283" />
      </PanelArtwork>
      {[1, 2].map((c) => {
        const offset = (c - 1) * 156;
        return (
          <div key={c}>
            <Legend x={34} y={64 + offset}>
              {c === 1 ? 'A' : 'B'}
            </Legend>
            <Action
              event={`trigger${c}`}
              label={`TRIG ${c === 1 ? 'A' : 'B'}`}
              x={116}
              y={64 + offset}
            />
            <Light
              on={running && Number(display[`env${c}`] ?? 0) > 0.05}
              x={198}
              y={64 + offset}
              label={`Envelope ${c === 1 ? 'A' : 'B'} active`}
            />
            <Dial id={`attack${c}`} x={68} y={111 + offset} />
            <Dial id={`decay${c}`} x={164} y={111 + offset} />
          </div>
        );
      })}
    </>
  );
}
