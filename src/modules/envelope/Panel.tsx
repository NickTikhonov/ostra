import { Dial } from '@/components/controls/Studio';
import { PanelArtwork, Legend } from '@/components/controls/PanelArtwork';
export default function Panel() {
  return (
    <>
      <PanelArtwork>
        <rect className="wash" x="18" y="121" width="196" height="176" rx="12" />
        <path d="M29 209H61L89 145L116 202H146L195 275H205" />
        <path d="M34 103V112H91V103M116 297V309H152M88 309H116" />
      </PanelArtwork>
      <Dial id="attack" x={48} y={159} />
      <Dial id="decay" x={183} y={159} />
      <Dial id="sustain" x={48} y={254} />
      <Dial id="release" x={183} y={254} />
      <Legend x={116} y={235}>
        A · D · S · R
      </Legend>
    </>
  );
}
