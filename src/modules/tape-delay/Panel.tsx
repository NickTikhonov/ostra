import { Dial } from '@/components/controls/Studio';
import { PanelArtwork, Legend } from '@/components/controls/PanelArtwork';
export default function Panel() {
  return (
    <>
      <PanelArtwork>
        <rect className="wash" x="58" y="54" width="274" height="153" rx="12" />
        <path d="M81 133A43 43 0 1 1 141 133M199 133A43 43 0 1 1 259 133" />
        <path d="M111 59H229M50 172H111V147M180 152V145M49 266H61V184M68 289H275M275 242V349M288 250H291M288 327H291" />
      </PanelArtwork>
      <Dial id="time" x={111} y={103} large />
      <Dial id="feedback" x={229} y={103} large />
      <Dial id="drive" x={94} y={242} />
      <Dial id="tone" x={175} y={242} />
      <Dial id="mix" x={250} y={242} />
      <Dial id="age" x={94} y={323} />
      <Dial id="wow" x={175} y={323} />
      <Dial id="hiss" x={250} y={323} />
      <Legend x={285} y={182}>
        TAPE LOOP
      </Legend>
      <Legend x={160} y={295}>
        COLOUR / INSTABILITY
      </Legend>
    </>
  );
}
