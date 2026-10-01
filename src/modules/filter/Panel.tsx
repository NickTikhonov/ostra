import { Dial } from '@/components/controls/Studio';
import { PanelArtwork } from '@/components/controls/PanelArtwork';
export default function Panel() {
  return (
    <>
      <PanelArtwork>
        <path d="M49 82H64M155 110H171M49 191H63V301H80M32 319V345H111" />
        <path d="M159 87V330M159 210H171M159 309H171" />
        <path className="faint" d="M57 160H123Q133 160 137 146L147 174H159" />
        <rect className="wash" x="69" y="62" width="84" height="90" rx="40" />
      </PanelArtwork>
      <Dial id="cutoff" x={111} y={105} large />
      <Dial id="resonance" x={111} y={210} />
      <Dial id="depth" x={111} y={303} />
    </>
  );
}
