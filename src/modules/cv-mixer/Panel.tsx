import { Dial } from '@/components/controls/Studio';
import { PanelArtwork, Legend } from '@/components/controls/PanelArtwork';
import { ModuleSwitch, useModule } from '@/components/controls/ModuleControls';
import styles from './panel.module.css';

export default function Panel() {
  const { display, running } = useModule();
  return (
    <>
      <PanelArtwork>
        {[83, 181, 279].map((y) => (
          <g key={y}>
            <rect className="wash" x="14" y={y - 29} width="276" height="75" rx="9" />
            <path d={`M46 ${y}H61M107 ${y}H121V${y + 43}H233V${y}H250M161 ${y}H177M223 ${y}H250`} />
          </g>
        ))}
      </PanelArtwork>
      {[1, 2, 3].map((channel, index) => {
        const y = 83 + index * 98;
        return (
          <div key={channel}>
            <Dial id={`a${channel}`} x={84} y={y} />
            <Dial id={`b${channel}`} x={200} y={y} />
            <div className={styles.polarity} style={{ top: y + 30 }} aria-hidden="true">
              <i
                className={styles.negative}
                style={{
                  opacity: running
                    ? 0.15 + 0.85 * Math.sqrt(Number(display[`negative${channel}`] ?? 0))
                    : 0.15,
                }}
              />
              <i
                className={styles.positive}
                style={{
                  opacity: running
                    ? 0.15 + 0.85 * Math.sqrt(Number(display[`positive${channel}`] ?? 0))
                    : 0.15,
                }}
              />
            </div>
          </div>
        );
      })}
      <div className={styles.link12}>
        <ModuleSwitch id="link12" label="1 ↓ 2" className={styles.link} />
      </div>
      <div className={styles.link23}>
        <ModuleSwitch id="link23" label="2 ↓ 3" className={styles.link} />
      </div>
      <Legend x={151} y={343}>
        − × + · EMPTY INPUT = +5V
      </Legend>
    </>
  );
}
