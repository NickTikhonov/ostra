import { Dial, Choice } from '@/components/controls/Studio';
import { PanelArtwork, Legend } from '@/components/controls/PanelArtwork';
export default function Panel() {
  return (
    <>
      <PanelArtwork>
        <path d="M43 111V133H109V111M76 133V151M76 246V269" />
        <rect className="wash" x="25" y="151" width="102" height="104" rx="50" />
        <path d="M42 333H110M52 340H100M62 347H90" />
      </PanelArtwork>
      <Dial id="level" x={76} y={198} large />
      <Choice id="mute" options={['OPEN', 'MUTED']} x={76} y={290} />
      <Legend x={76} y={123}>
        STEREO / MONO
      </Legend>
    </>
  );
}
