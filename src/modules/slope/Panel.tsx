import { Dial, Choice } from '@/components/controls/Studio';
import { PanelArtwork, Legend } from '@/components/controls/PanelArtwork';
export default function Panel() {
  return (
    <>
      <PanelArtwork>
        <path d="M32 103V132L89  60L153 191H164M49 246H66M118 246H129M91 274V326H129" />
        <rect className="wash" x="17" y="137" width="150" height="75" rx="9" />
      </PanelArtwork>
      <Dial id="rise" x={50} y={169} />
      <Dial id="fall" x={134} y={169} />
      <Choice id="cycle" options={['ONE SHOT', 'CYCLE']} x={91} y={246} />
      <Legend x={58} y={326}>
        ↻ FUNCTION
      </Legend>
    </>
  );
}
