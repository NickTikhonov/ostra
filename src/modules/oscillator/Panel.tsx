import { Dial } from '@/components/controls/Studio';
import { PanelArtwork } from '@/components/controls/PanelArtwork';
export default function Panel() {
  return (
    <>
      <PanelArtwork>
        <rect className="wash" x="62" y="58" width="90" height="296" rx="43" />
        <path d="M47 80H70M47 164H 70" />
        <path d="M47 246H79M47 325H79M155 102H168V326M168 80V102M168 80H181M168 162H181M168 244H181M168 326H181" />
      </PanelArtwork>
      <Dial id="tune" x={107} y={103} large />
      <Dial id="fine" x={107} y={184} />
      <Dial id="fm" x={107} y={255} />
      <Dial id="width" x={107} y={327} />
    </>
  );
}
