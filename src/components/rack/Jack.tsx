'use client';
import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import type { Port } from '@/modules/types';
export function Jack({
  port,
  direction,
  moduleId,
  moduleName,
  x,
  y,
  color,
  connected,
  active,
  ...events
}: {
  port: Port;
  direction: 'in' | 'out';
  moduleId: string;
  moduleName: string;
  x: number;
  y: number;
  color?: string;
  connected: boolean;
  active: boolean;
} & Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  | 'onPointerDown'
  | 'onClick'
  | 'onKeyDown'
  | 'onContextMenu'
  | 'onPointerEnter'
  | 'onPointerLeave'
  | 'onFocus'
  | 'onBlur'
>) {
  // Port coordinates include the panel's 1px border; absolute CSS positions start inside it.
  return (
    <div
      className={`port ${direction}`}
      data-label-position={port.labelPosition}
      style={{ left: x - 1, top: y - 1, '--cable-color': color } as CSSProperties}
    >
      <button
        className={`jack ${color ? 'connected' : ''} ${active ? 'active' : ''}`}
        data-module={moduleId}
        data-port={port.id}
        data-direction={direction}
        aria-label={`${moduleName} ${port.label} ${direction === 'in' ? 'input' : 'output'}`}
        aria-description={`${connected ? 'Click/drag to reconnect' + (direction === 'out' ? ' newest cable · Shift-click to add' : '') : 'Click/drag to patch'} · Right-click to unplug`}
        {...events}
      >
        <span />
      </button>
      <span className="port-label">{port.label}</span>
    </div>
  );
}
