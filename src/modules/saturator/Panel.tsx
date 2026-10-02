'use client';
import { Dial } from '@/components/controls/Studio';
import { useModule, ModuleSwitch } from '@/components/controls/ModuleControls';
import styles from './panel.module.css';
const ticks = [-20, -10, -5, 0, 6, 12];
const angle = (db: number) => -55 + ((Math.max(-20, Math.min(12, db)) + 20) / 32) * 110;
function point(degrees: number, radius: number) {
  const radians = (degrees * Math.PI) / 180;
  return { x: 100 + Math.sin(radians) * radius, y: 98 - Math.cos(radians) * radius };
}
export default function Panel() {
  const { display, running } = useModule();
  const db = running ? Number(display.driveDb ?? -60) : -60;
  const redStart = point(angle(0), 66),
    redEnd = point(angle(12), 66);
  return (
    <>
      <div
        className={styles.meter}
        role="img"
        aria-label={
          running ? `Saturation drive: ${Math.round(db)} dB` : 'Saturation drive meter: idle'
        }
      >
        <svg viewBox="0 0 200 90" aria-hidden="true">
          <path className={styles.arc} d="M46 60A66 66 0 0 1 154 60" />
          <path
            className={styles.redArc}
            d={`M${redStart.x} ${redStart.y}A66 66 0 0 1 ${redEnd.x} ${redEnd.y}`}
          />
          {ticks.map((value) => {
            const a = angle(value),
              inner = point(a, 62),
              outer = point(a, 69),
              label = point(a, 79);
            return (
              <g key={value} className={value >= 0 ? styles.red : ''}>
                <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />
                <text x={label.x} y={label.y} dominantBaseline="central" textAnchor="middle">
                  {value > 0 ? '+' : ''}
                  {value}
                </text>
              </g>
            );
          })}
          <text x="23" y="81" className={styles.legend}>
            HEAT
          </text>
          <text x="147" y="81" className={styles.legend}>
            DRIVE dB
          </text>
          <g className={styles.needle} style={{ transform: `rotate(${angle(db)}deg)` }}>
            <line x1="100" y1="99" x2="100" y2="29" />
          </g>
          <circle cx="100" cy="98" r="13" className={styles.hub} />
        </svg>
      </div>
      <Dial id="drive" x={69} y={184} large />
      <Dial id="warmth" x={171} y={189} />
      <div className={styles.scorch}>
        <ModuleSwitch id="scorch" />
      </div>
      <Dial id="mix" x={69} y={282} />
      <Dial id="level" x={171} y={282} />
    </>
  );
}
