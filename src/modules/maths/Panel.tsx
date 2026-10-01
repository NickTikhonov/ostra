'use client';
import { Dial, Choice, Light } from '@/components/controls/Studio';
import { PanelArtwork, Legend } from '@/components/controls/PanelArtwork';
import { useModule } from '@/components/controls/ModuleControls';
export default function Panel() {
  const { display, running } = useModule();
  return (
    <>
      <PanelArtwork>
        {[0, 420].map((x) => (
          <g key={x}>
            <rect className="wash" x={x + 19} y="55" width="183" height="253" rx="14" />
            <path
              d={`M${x + 37} 197H${x + 67}L${x + 105} 177L${x + 149} 197H${x + 184}M${x + 42} 308V317M${x + 168} 308V317`}
            />
          </g>
        ))}
        <path d="M224 54V358M416 54V358M260 107V112M380 107V112M260 172V182M380 172V182M260 307H380" />
      </PanelArtwork>
      {[1, 4].map((n, index) => {
        const x = index * 420;
        return (
          <div key={n}>
            <Dial id={'rise' + n} x={x + 70} y={143} />
            <Dial id={'fall' + n} x={x + 168} y={143} />
            <Dial id={'curve' + n} x={x + 70} y={231} />
            <Dial id={'att' + n} x={x + 168} y={231} />
            <Choice id={'cycle' + n} options={['ONCE', 'CYCLE']} x={x + 110} y={338} />
            <Light
              on={running && Number(display[n === 1 ? 'ch1' : 'ch4']) > 1}
              x={x + 107}
              y={197}
            />
          </div>
        );
      })}
      <Dial id="att2" x={260} y={143} />
      <Dial id="att3" x={380} y={143} />
      <Legend x={320} y={241}>
        1 RISE / 4 CYCLE
      </Legend>
      <Legend x={320} y={303}>
        UNPATCHED SUM
      </Legend>
    </>
  );
}
