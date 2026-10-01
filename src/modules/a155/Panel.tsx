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
      <svg className="fp-engraving" viewBox="0 0 752 380">
        <path d="M19 77H595M19 102H595M19 129H595M19 154H595M19 245H490M19 354H134M357 354H490" />
        <rect x="610" y="35" width="47" height="155" rx="5" />
        <rect x="673" y="35" width="64" height="155" rx="5" />
        <rect x="610" y="196" width="127" height="76" rx="5" />
        <rect x="610" y="276" width="127" height="77" rx="5" />
      </svg>
      {Array.from({ length: 8 }, (_, i) => {
        const n = i + 1,
          x = 35 + i * 60;
        return (
          <div key={n}>
            <PanelText x={x} y={37}>
              {n}
            </PanelText>
            <PanelLed x={x} y={53} on={running && display.step === i} />
            <PanelToggle
              id={`top${n}`}
              x={x}
              y={89}
              options={['1', '–', '2']}
              label={`Step ${n}: trigger 1 / off / trigger 2`}
            />
            <PanelToggle
              id={`bottom${n}`}
              x={x}
              y={141}
              options={['3', '–', 'G']}
              label={`Step ${n}: trigger 3 / off / gate`}
            />
            <PanelKnob id={`a${n}`} x={x} y={202} />
            <PanelKnob id={`b${n}`} x={x} y={282} />
          </div>
        );
      })}
      <PanelToggle id="range" x={520} y={202} options={['1 V', '2 V', '4 V']} />
      <PanelText x={518} y={237}>
        Range
      </PanelText>
      <PanelKnob id="glide1" x={576} y={202} />
      <PanelText x={576} y={237}>
        Glide
      </PanelText>
      <PanelKnob id="scale" x={520} y={282} />
      <PanelKnob id="glide2" x={576} y={282} />
      <PanelText x={520} y={315}>
        Scale
      </PanelText>
      <PanelText x={576} y={315}>
        Glide
      </PanelText>
      <PanelText x={245} y={355}>
        External CV / audio inputs
      </PanelText>
      <PanelText x={575} y={43}>
        Trig. Control
      </PanelText>
      {[1, 2, 3, 4].map((n, i) => (
        <PanelLed key={n} x={574} y={76 + i * 26} on={running && !!display[`track${n}`]} />
      ))}
      {['start', 'stop', 'clock', 'reset'].map((event, i) => (
        <PanelButton key={event} event={event} label={`Manual ${event}`} x={724} y={59 + i * 38} />
      ))}
    </>
  );
}
