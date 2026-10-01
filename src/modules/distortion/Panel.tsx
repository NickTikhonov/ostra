import { Dial, Choice } from '@/components/controls/Studio';
import { PanelArtwork, Legend } from '@/components/controls/PanelArtwork';
export default function Panel() {
  return (
    <>
      <PanelArtwork>
        <path d="M49 90H63M152 90H163M30 204V215H63M157 215H185V183H171" />
        <path
          className="faint"
          d="M19 258L36 235L53 258L70 235L87 258L104 235L121 258L138 235L155 258L172 235L197 258"
        />
        <rect className="wash" x="15" y="276" width="186" height="75" rx="9" />
      </PanelArtwork>
      <Dial id="drive" x={108} y={106} large />
      <Choice id="mode" options={['FUZZ', 'RAZOR', 'FOLD']} x={113} y={188} />
      <Dial id="dirt" x={45} y={307} />
      <Dial id="tone" x={108} y={307} />
      <Dial id="mix" x={171} y={307} />
      <Legend x={111} y={244}>
        BREAK UP
      </Legend>
    </>
  );
}
