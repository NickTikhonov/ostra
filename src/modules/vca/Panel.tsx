import { Dial } from '@/components/controls/Studio';
import { PanelArtwork, Legend } from '@/components/controls/PanelArtwork';
export default function Panel() {
  return (
    <>
      <PanelArtwork>
        <path d="M32 104V143H49M50 80L148 126L50 172ZM98 172V190M51 231H148M148 250V302" />
        <path className="faint" d="M32 269V320H125" />
      </PanelArtwork>
      <Dial id="gain" x={99} y={122} large />
      <Dial id="depth" x={83} y={231} />
      <Dial id="curve" x={148} y={231} />
      <Legend x={70} y={314}>
        AMPLITUDE →
      </Legend>
    </>
  );
}
