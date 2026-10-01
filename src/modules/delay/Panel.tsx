import { Dial, Choice } from '@/components/controls/Studio';
import { PanelArtwork, Legend } from '@/components/controls/PanelArtwork';
export default function Panel() {
  return (
    <>
      <PanelArtwork>
        <rect className="wash" x="58" y="58" width="178" height="107" rx="14" />
        <path d="M49 80H60M49 176H91V151M143 83H160V65H230V164H180V142M49 273H76V285M170 267V290H200V258H202M200 290V329H202" />
        <path className="faint" d="M69 186V201M96 186V209M123 186V216M150 186V221" />
      </PanelArtwork>
      <Dial id="time" x={101} y={101} large />
      <Dial id="feedback" x={198} y={103} />
      <Dial id="tone" x={78} y={241} />
      <Dial id="mix" x={166} y={241} />
      <Choice
        id="division"
        options={['SYNC ¼', 'SYNC ½', 'SYNC 1', 'SYNC 1½', 'SYNC 2']}
        x={98}
        y={328}
      />
      <Legend x={198} y={152}>
        ↺ REPEATS
      </Legend>
    </>
  );
}
