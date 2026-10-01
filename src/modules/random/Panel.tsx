'use client';
import { Dial, Choice, Action, Light } from '@/components/controls/Studio';
import { PanelArtwork, Legend } from '@/components/controls/PanelArtwork';
import { useModule } from '@/components/controls/ModuleControls';
export default function Panel() {
  const { display, running } = useModule();
  return (
    <>
      <PanelArtwork>
        <rect className="wash" x="75" y="58" width="148" height="217" rx="65" />
        <path d="M56 85H70M56 166H75M223 85H243M223 166H243M223 247H243M91 290H209" />
      </PanelArtwork>
      <Dial id="rate" x={112} y={109} />
      <Dial id="range" x={191} y={109} />
      <Dial id="slew" x={112} y={221} />
      <Dial id="chance" x={191} y={221} />
      <Choice id="polarity" options={['0 → +V', '−V → +V']} x={133} y={314} />
      <Action event="sample" label="SAMPLE" x={133} y={352} />
      <Light on={running && display.gate === true} x={222} y={328} />
      <Legend x={150} y={171}>
        CLOCKED VOLTAGES
      </Legend>
    </>
  );
}
