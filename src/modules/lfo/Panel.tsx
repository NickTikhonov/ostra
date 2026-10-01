import { Dial, Choice } from '@/components/controls/Studio';
import { PanelArtwork, Legend } from '@/components/controls/PanelArtwork';
export default function Panel() {
  return (
    <>
      <PanelArtwork>
        <rect className="wash" x="13" y="56" width="108" height="110" rx="50" />
        <path d="M122 109H132V292M132 86H139M132 181H139M132 276H139M48 203H54V173H68V157M32 261V249H61" />
      </PanelArtwork>
      <Dial id="rate" x={68} y={108} large />
      <Dial id="depth" x={94} y={215} />
      <Choice id="polarity" options={['± BIPOLAR', '+ UNIPOLAR']} x={78} y={329} />
      <Legend x={93} y={282}>
        ↻ PHASE
      </Legend>
    </>
  );
}
