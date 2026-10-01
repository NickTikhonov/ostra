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
      <PanelKnob id="range" x={109} y={68} small />
      <PanelKnob id="tune" x={109} y={121} />
      <PanelKnob id="cv2" x={109} y={177} />
      <PanelKnob id="pw" x={109} y={232} />
      <PanelKnob id="pwm" x={109} y={287} />
    </>
  );
}
