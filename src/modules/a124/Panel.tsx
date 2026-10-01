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
      {['level', 'cutoff', 'cv2', 'resonance', 'mix'].map((id, i) => (
        <PanelKnob key={id} id={id} x={90} y={78 + i * 57} />
      ))}
    </>
  );
}
