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
      {[1, 2].map((n, i) => (
        <div key={n}>
          <PanelKnob id={`cv${n}`} x={90} y={78 + i * 159} />
          <PanelKnob id={`gain${n}`} x={90} y={134 + i * 159} />
          <PanelToggle id={`curve${n}`} x={90} y={183 + i * 158} options={['lin.', 'exp.']} />
        </div>
      ))}
      <svg className="fp-engraving" viewBox="0 0 128 380">
        <path d="M12 208H116" />
      </svg>
    </>
  );
}
