'use client';
import type { ReactNode } from 'react';
import { useModule } from './ModuleControls';

/** Printed artwork only. Each panel supplies its own geometry and signal flow. */
export function PanelArtwork({ children }: { children: ReactNode }) {
  const { definition } = useModule();
  return (
    <svg className="panel-artwork" viewBox={`0 0 ${definition.width} 380`} aria-hidden="true">
      {children}
    </svg>
  );
}
export function Legend({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <span className="panel-legend" style={{ left: x, top: y }} aria-hidden="true">
      {children}
    </span>
  );
}
