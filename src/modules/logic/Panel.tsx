'use client';
import { Dial, Light } from '@/components/controls/Studio';
import { PanelArtwork, Legend } from '@/components/controls/PanelArtwork';
import { useModule } from '@/components/controls/ModuleControls';
export default function Panel() {
  const { display, running } = useModule();
  return (
    <>
      <PanelArtwork>
        <path d="M56 85H91V154H56M110 55V186M19 208H301M59 265H84M228 265H258M228 265V331H258" />
        <rect className="wash" x="123" y="54" width="182" height="132" rx="10" />
      </PanelArtwork>
      <Light on={running && display.a === true} x={76} y={85} />
      <Light on={running && display.b === true} x={76} y={154} />
      <Legend x={164} y={228}>
        VOLTAGE COMPARATOR
      </Legend>
      <Dial id="threshold" x={116} y={270} />
      <Dial id="hysteresis" x={207} y={322} />
      <Light on={running && display.high === true} x={239} y={265} />
    </>
  );
}
