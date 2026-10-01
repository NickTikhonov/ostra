import {
  PanelKnob,
  PanelToggle,
  PanelText,
  PanelLed,
  PanelButton,
} from '@/components/controls/Faceplate';
import { useModule } from '@/components/controls/ModuleControls';
export default function Panel() {
  return (
    <>
      <PanelKnob id="offset" x={40} y={82} />
      <PanelKnob id="amount" x={40} y={154} />
      <PanelToggle id="mode" x={40} y={206} options={['Att.', 'Pol.']} />
    </>
  );
}
