'use client';
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ProbeAnchor, ScopeFrame, ScopeTrace } from '@/lib/scope';

const HOVER_DELAY_MS = 600;

function Trace({
  trace,
  label,
  color,
}: {
  trace: ScopeTrace | null;
  label: string;
  color: string;
}) {
  const values = trace ? [...trace.min, ...trace.max] : [];
  const peak = Math.max(5, ...values.map(Math.abs)),
    limit = Math.ceil(peak / 5) * 5;
  const mapY = (v: number) => 41 - (v / limit) * 31;
  const start = trace ? 1 - Math.min(1, trace.seconds / trace.window) : 0;
  const x = (i: number) =>
    32 + (start + ((1 - start) * i) / Math.max(1, (trace?.min.length ?? 1) - 1)) * 240;
  let envelope = '',
    centre = '';
  if (trace?.min.length) {
    envelope =
      trace.max.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${mapY(v)}`).join(' ') +
      trace.min
        .slice()
        .reverse()
        .map((v, i) => `L${x(trace.min.length - 1 - i)},${mapY(v)}`)
        .join(' ') +
      'Z';
    centre = trace.min
      .map((v, i) => `${i ? 'L' : 'M'}${x(i)},${mapY((v + trace.max[i]) / 2)}`)
      .join(' ');
  }
  return (
    <div className="scope-trace">
      <span>{label}</span>
      <svg viewBox="0 0 284 82" aria-label={`${label}: voltage over time`}>
        {[10, 41, 72].map((y) => (
          <path key={y} d={`M32 ${y}H274`} className={y === 41 ? 'scope-zero' : 'scope-grid'} />
        ))}
        {[32, 92, 152, 212, 272].map((x) => (
          <path key={x} d={`M${x} 8V74`} className="scope-grid" />
        ))}
        <text x="2" y="13">
          +{limit}V
        </text>
        <text x="12" y="44">
          0
        </text>
        <text x="2" y="75">
          −{limit}V
        </text>
        <path d={envelope} fill={color} opacity=".4" />
        <path d={centre} stroke={color} strokeWidth="1.5" fill="none" />
      </svg>
    </div>
  );
}
export function JackScope({
  probe,
  frame,
  running,
  viewport,
}: {
  probe: ProbeAnchor;
  frame: ScopeFrame | null;
  running: boolean;
  viewport: { width: number; height: number };
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), HOVER_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);
  if (!visible) return null;
  const data = frame?.key === probe.key ? frame : null;
  const left = Math.max(8, Math.min(viewport.width - 312, probe.x + 22));
  const top = Math.max(8, Math.min(viewport.height - 190, probe.y - 90));
  const values = data ? [...data.slow.min, ...data.slow.max] : [];
  const low = values.length ? Math.min(...values) : 0,
    high = values.length ? Math.max(...values) : 0;
  return (
    <aside
      className="jack-scope"
      role="tooltip"
      style={{ left, top, '--scope-color': probe.color } as CSSProperties}
    >
      <header>
        <span>{probe.label}</span>
        <b>{running ? 'LIVE' : 'PAUSED'}</b>
      </header>
      <div className="scope-reading">
        {data ? `${data.current >= 0 ? '+' : ''}${data.current.toFixed(2)}` : '—'} <span>V</span>
        <small>
          {data
            ? `${(high - low).toFixed(2)} V peak to peak`
            : running
              ? 'Collecting voltage…'
              : 'Start transport to inspect'}
        </small>
      </div>
      <Trace trace={data?.slow ?? null} label="4 s · history" color={probe.color} />
      <footer>
        {data ? `${low.toFixed(2)} → ${high.toFixed(2)} V` : 'Audio + CV · actual jack voltage'}
        <span>now →</span>
      </footer>
    </aside>
  );
}
