import { Dial, Choice, Action, Readout } from '@/components/controls/Studio';
import { PanelArtwork } from '@/components/controls/PanelArtwork';
import { useModule } from '@/components/controls/ModuleControls';
export default function Panel() {
  const { module } = useModule();
  return (
    <>
      <PanelArtwork>
        <path d="M32 234V254H152V234M49 316H64M119 316H130M136 75H160V147H136" />
        <path className="faint" d="M24 163H34V151H45V163H56" />
      </PanelArtwork>
      <Readout x={62} y={70}>
        {Math.round(module.params.bpm)}
      </Readout>
      <Dial id="bpm" x={84} y={135} large />
      <Dial id="swing" x={91} y={218} />
      <Choice id="rate" options={['1/4', '1/8', '1/16', '1/32']} x={91} y={277} />
      <Action event="reset" label="↺ RESET" x={91} y={326} />
    </>
  );
}
