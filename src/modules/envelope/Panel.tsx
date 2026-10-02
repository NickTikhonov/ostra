import { Dial } from '@/components/controls/Studio';
import { PanelArtwork } from '@/components/controls/PanelArtwork';
export default function Panel() {
  return (
    <>
      <PanelArtwork>
        <rect className="wash" x="18" y="54" width="133" height="306" rx="12" />
        <path d="M164 57V356" />
        {[88, 167, 246, 325].map((y) => (
          <path key={y} d={`M79 ${y}H103`} />
        ))}
      </PanelArtwork>
      <Dial id="attack" x={52} y={88} />
      <Dial id="decay" x={52} y={167} />
      <Dial id="sustain" x={52} y={246} />
      <Dial id="release" x={52} y={325} />
    </>
  );
}
