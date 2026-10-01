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
      {['level1', 'level2', 'level3', 'level4', 'master'].map((id, i) => (
        <PanelKnob key={id} id={id} x={90} y={74 + i * 58} />
      ))}
    </>
  );
}
