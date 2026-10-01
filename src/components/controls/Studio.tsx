'use client';
import type { ReactNode } from 'react';
import { ModuleKnob, useModule } from './ModuleControls';

export function Dial({
  id,
  x,
  y,
  large = false,
}: {
  id: string;
  x: number;
  y: number;
  large?: boolean;
}) {
  return (
    <div className={`studio-dial ${large ? 'hero' : ''}`} style={{ left: x, top: y }}>
      <ModuleKnob id={id} large={large} />
    </div>
  );
}
export function Choice({
  id,
  options,
  x,
  y,
}: {
  id: string;
  options: string[];
  x: number;
  y: number;
}) {
  const { module, definition, beginEdit, setParam } = useModule();
  const param = definition.params.find((p) => p.id === id)!;
  const value = Math.round(module.params[id]);
  return (
    <div className="studio-choice" style={{ left: x, top: y }}>
      <span>{param.label}</span>
      <button
        aria-label={param.label}
        title={`${param.label}: ${options[value - param.min]}`}
        onClick={() => {
          beginEdit();
          setParam(id, value >= param.max ? param.min : value + 1);
        }}
        onKeyDown={(e) => {
          if (['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp'].includes(e.key)) {
            e.preventDefault();
            beginEdit();
            setParam(
              id,
              Math.max(
                param.min,
                Math.min(param.max, value + (['ArrowUp', 'ArrowRight'].includes(e.key) ? 1 : -1)),
              ),
            );
          }
        }}
      >
        {options[value - param.min]}
        <i>↔</i>
      </button>
    </div>
  );
}
export function Readout({ children, x, y }: { children: ReactNode; x: number; y: number }) {
  return (
    <div className="studio-readout" style={{ left: x, top: y }}>
      {children}
    </div>
  );
}
export function Action({
  event,
  label,
  x,
  y,
}: {
  event: string;
  label: string;
  x: number;
  y: number;
}) {
  const { trigger } = useModule();
  return (
    <button className="studio-action" style={{ left: x, top: y }} onClick={() => trigger(event)}>
      {label}
    </button>
  );
}
export function Light({ on, x, y, label }: { on: boolean; x: number; y: number; label?: string }) {
  return (
    <span
      aria-label={label}
      style={{
        position: 'absolute',
        left: x - 3,
        top: y - 3,
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: on ? '#ffe5a0' : '#354c4433',
        boxShadow: on ? '0 0 7px #ffe5a0' : 'inset 0 1px #273c3722',
      }}
    />
  );
}
export function SignalArt({
  kind,
}: {
  kind:
    'wave' | 'envelope' | 'filter' | 'echo' | 'grit' | 'clock' | 'steps' | 'gain' | 'prism' | 'out';
}) {
  const lines = {
    wave: 'M0 30C10 0 20 0 30 30S50 60 60 30S80 0 90 30S110 60 120 30',
    envelope: 'M0 51H14L31 6L54 30H85L108 51H120',
    filter: 'M0 13H45Q66 13 70 6Q74 0 78 23L100 51H120',
    echo: 'M4 50V6M25 50V16M46 50V25M67 50V33M88 50V40M109 50V46',
    grit: 'M0 32L12 5L25 51L39 5H52L65 51H79L92 5L105 51L120 29',
    clock: 'M0 48H12V10H33V48H55V10H76V48H98V10H119',
    steps: 'M0 45H18V26H36V11H54V34H72V20H90V44H108V8H120',
    gain: 'M4 46L30 20L57 46M63 46L90 5L117 46',
    prism: 'M10 48L60 3L110 48ZM33 48L60 24L87 48M60 3V48',
    out: 'M10 17H27L47 3V53L27 39H10ZM65 16Q83 28 65 40M78 5Q108 28 78 51',
  };
  return (
    <svg className="signal-art" viewBox="0 0 120 56" aria-hidden="true">
      <path d={lines[kind]} />
    </svg>
  );
}
