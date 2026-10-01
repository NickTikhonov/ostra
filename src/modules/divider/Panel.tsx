import { Dial, Choice } from '@/components/controls/Studio';
import { PanelArtwork, Legend } from '@/components/controls/PanelArtwork';
export default function Panel() {
  return (
    <>
      <PanelArtwork>
        <path d="M53 78H115V320M115 80H135M115 160H135M115 240H135M115 320H135M36 304V287H105" />
        <circle className="solid" cx="115" cy="160" r="2" />
        <circle className="solid" cx="115" cy="240" r="2" />
      </PanelArtwork>
      <Choice id="mode" options={['TRIGGER', 'GATE']} x={60} y={162} />
      <Dial id="offset" x={60} y={244} />
      <Legend x={60} y={118}>
        PULSE TREE
      </Legend>
    </>
  );
}
