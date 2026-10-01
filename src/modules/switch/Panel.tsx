'use client';
import { Dial, Choice, Action, Light } from '@/components/controls/Studio';
import { PanelArtwork, Legend } from '@/components/controls/PanelArtwork';
import { useModule } from '@/components/controls/ModuleControls';
export default function Panel() {
  const { module, display, running } = useModule();
  const active = running ? Number(display.selected ?? 0) : module.params.select - 1;
  return (
    <>
      <PanelArtwork>
        {[75, 137, 199, 261].map((y) => (
          <path key={y} d={`M51 ${y}H64M294 ${y}H309`} />
        ))}
        <rect className="wash" x="77" y="55" width="206" height="234" rx="14" />
        <path d="M70 60V280M290 60V280" />
      </PanelArtwork>
      <Dial id="select" x={181} y={107} large />
      {[0, 1, 2, 3].map((n) => (
        <Light key={n} on={active === n} x={65} y={75 + n * 62} />
      ))}
      <Choice id="mode" options={['FOLLOW CV', 'CLOCK CV']} x={220} y={191} />
      <Choice id="length" options={['1', '2', '3', '4']} x={122} y={253} />
      <Action event="step" label="ADVANCE" x={227} y={257} />
      <Legend x={180} y={59}>
        4 → 1 / 1 → 4
      </Legend>
    </>
  );
}
