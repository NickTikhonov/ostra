import { Dial } from '@/components/controls/Studio';
import { PanelArtwork, Legend } from '@/components/controls/PanelArtwork';
export default function Panel() {
  return (
    <>
      <PanelArtwork>
        <rect className="wash" x="16" y="57" width="200" height="223" rx="14" />
        <path d="M34 193H65C104 193 126 164 165 164H198" />
        <path className="faint" d="M34 178H198M116 286V300M34 302H198" />
      </PanelArtwork>
      <Dial id="drive" x={69} y={105} large />
      <Dial id="warmth" x={171} y={110} />
      <Dial id="mix" x={69} y={233} />
      <Dial id="level" x={171} y={233} />
      <Legend x={116} y={290}>
        SOFT KNEE · STEREO
      </Legend>
    </>
  );
}
