'use client';
import { Dial, Light } from '@/components/controls/Studio';
import { PanelArtwork, Legend } from '@/components/controls/PanelArtwork';
import { useModule } from '@/components/controls/ModuleControls';
export default function Panel() {
  const { display, running } = useModule();
  return (
    <>
      <PanelArtwork>
        {[60, 162, 264].map((x) => (
          <g key={x}>
            <rect className="wash" x={x - 43} y="54" width="86" height="299" rx="12" />
            <path d={`M${x - 23} 112H${x + 23}M${x} 183V194M${x} 261V277`} />
          </g>
        ))}
        <path d="M323 53V357M355 115H438M396 190V200M343 311H450" />
      </PanelArtwork>
      {[60, 162, 264].map((x, n) => (
        <div key={x}>
          <Dial id={'level' + (n + 1)} x={x} y={148} />
          <Dial id={'pan' + (n + 1)} x={x} y={225} />
          <Dial id={'send' + (n + 1)} x={x} y={304} />
        </div>
      ))}
      <Dial id="return" x={396} y={148} />
      <Dial id="master" x={396} y={223} />
      <Light on={running && Number(display.left) > 1} x={337} y={341} />
      <Light on={running && Number(display.right) > 1} x={456} y={341} />
      <Legend x={395} y={53}>
        STEREO RETURN
      </Legend>
    </>
  );
}
