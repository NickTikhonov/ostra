'use client';
import type { CSSProperties, ReactNode } from 'react';
import { ModuleKnob, useModule } from './ModuleControls';

export function At({
  x,
  y,
  children,
  className = '',
}: {
  x: number;
  y: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`fp-at ${className}`} style={{ left: x, top: y }}>
      {children}
    </div>
  );
}
export function PanelKnob({
  id,
  x,
  y,
  small = false,
}: {
  id: string;
  x: number;
  y: number;
  small?: boolean;
}) {
  return (
    <At x={x} y={y} className={`fp-knob ${small ? 'fp-small' : ''}`}>
      {!small && (
        <svg className="fp-dial-scale" viewBox="-30 -30 60 60" aria-hidden="true">
          {[0, 2, 4, 6, 8, 10].map((n, i) => {
            const angle = ((-135 + i * 54) * Math.PI) / 180;
            return (
              <text
                key={n}
                x={Math.sin(angle) * 26}
                y={-Math.cos(angle) * 26 + 1.5}
                textAnchor="middle"
              >
                {n}
              </text>
            );
          })}
        </svg>
      )}
      <ModuleKnob id={id} />
    </At>
  );
}
export function PanelText({
  x,
  y,
  children,
  className = '',
}: {
  x: number;
  y: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <At x={x} y={y} className={`fp-text ${className}`}>
      {children}
    </At>
  );
}
export function PanelToggle({
  id,
  x,
  y,
  options,
  label,
}: {
  id: string;
  x: number;
  y: number;
  options: string[];
  label?: string;
}) {
  const { module, definition, beginEdit, setParam } = useModule();
  const param = definition.params.find((p) => p.id === id)!;
  const value = Math.round(module.params[id]);
  return (
    <At x={x} y={y} className="fp-toggle-control">
      <button
        className="fp-toggle"
        role="slider"
        aria-label={label ?? param.label}
        aria-valuemin={param.min}
        aria-valuemax={param.max}
        aria-valuenow={value}
        aria-valuetext={options[value - param.min]}
        title={`${label ?? param.label}: ${options[value - param.min]}`}
        style={
          {
            '--throw': `${((value - param.min) / (param.max - param.min)) * 14 - 7}px`,
          } as CSSProperties
        }
        onClick={() => {
          beginEdit();
          setParam(id, value >= param.max ? param.min : value + 1);
        }}
        onKeyDown={(e) => {
          if (['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'Home', 'End'].includes(e.key)) {
            e.preventDefault();
            beginEdit();
            setParam(
              id,
              e.key === 'Home'
                ? param.min
                : e.key === 'End'
                  ? param.max
                  : Math.max(
                      param.min,
                      Math.min(
                        param.max,
                        value + (['ArrowUp', 'ArrowRight'].includes(e.key) ? 1 : -1),
                      ),
                    ),
            );
          }
        }}
      >
        <i />
      </button>
      <span className="fp-toggle-options">
        {options.map((option, i) => (
          <span key={i} className={value === i + param.min ? 'selected' : ''}>
            {option}
          </span>
        ))}
      </span>
    </At>
  );
}
export function PanelLed({
  x,
  y,
  on,
  color = 'red',
}: {
  x: number;
  y: number;
  on: boolean;
  color?: string;
}) {
  return (
    <At x={x} y={y} className={`fp-led ${on ? 'lit' : ''} ${color}`}>
      <i />
    </At>
  );
}
export function PanelButton({
  event,
  x,
  y,
  label,
}: {
  event: string;
  x: number;
  y: number;
  label: string;
}) {
  const { trigger } = useModule();
  return (
    <At x={x} y={y}>
      <button
        className="fp-button"
        aria-label={label}
        title={label}
        onClick={() => trigger(event)}
      />
    </At>
  );
}
