import {
  PanelKnob,
  PanelToggle,
  PanelText,
  PanelLed,
  PanelButton,
} from '@/components/controls/Faceplate';
import { useModule } from '@/components/controls/ModuleControls';
export default function Panel() {
  const { display, running } = useModule();
  return (
    <>
      <PanelText x={64} y={85}>
        1
      </PanelText>
      <PanelText x={64} y={191}>
        2
      </PanelText>
      <PanelLed x={64} y={128} on={running && !!display.trigger1} />
      <PanelLed x={64} y={240} on={running && !!display.trigger2} />
      <PanelToggle id="scale" x={88} y={279} options={['Minor', 'Major', 'All']} />
      <PanelToggle id="mode" x={88} y={310} options={['Quint', 'Chord', 'Scale']} />
      <PanelToggle id="extension" x={88} y={341} options={['+ 6', '–', '+ 7']} />
      <PanelText x={29} y={344}>
        CV 1 + 2
      </PanelText>
      <svg className="fp-engraving" viewBox="0 0 128 380">
        <path d="M12 153H116M12 263H116M62 264V354" />
      </svg>
    </>
  );
}
