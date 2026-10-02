import { Dial } from '@/components/controls/Studio';
import { PanelArtwork, Legend } from '@/components/controls/PanelArtwork';
export default function Panel() {
  return (
    <>
      <PanelArtwork>
        <rect className="wash" x="12" y="52" width="160" height="151" rx="10" />
        <rect className="wash" x="12" y="208" width="160" height="151" rx="10" />
        <path d="M54 173H72M111 173H128M54 329H72M111 329H128" />
      </PanelArtwork>
      <Legend x={92} y={64}>
        CHANNEL A
      </Legend>
      <Dial id="gain" x={36} y={103} />
      <Dial id="depth" x={92} y={103} />
      <Dial id="curve" x={148} y={103} />
      <Legend x={92} y={220}>
        CHANNEL B
      </Legend>
      <Dial id="gain2" x={36} y={259} />
      <Dial id="depth2" x={92} y={259} />
      <Dial id="curve2" x={148} y={259} />
    </>
  );
}
