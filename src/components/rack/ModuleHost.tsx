'use client';
import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import type { ModulePlugin, Port } from '@/modules/types';
import { MODULE_HEIGHT } from '@/lib/modules';
import { ModuleControlsProvider, type ModuleControls } from '@/components/controls/ModuleControls';
export function ModuleHost({
  plugin,
  controls,
  renderPort,
  onMove,
  onRemove,
  locked = false,
}: {
  plugin: ModulePlugin;
  controls: ModuleControls;
  renderPort: (port: Port, direction: 'in' | 'out') => ReactNode;
  onMove: (event: PointerEvent<HTMLElement>) => void;
  onRemove: () => void;
  locked?: boolean;
}) {
  const { definition: d, Panel } = plugin;
  const { module: m } = controls;
  return (
    <ModuleControlsProvider value={controls}>
      <section
        className={`module ${d.layout ?? ''} ${plugin.className ?? ''}`}
        aria-label={`${d.name} module`}
        data-header={d.headerLayout}
        data-port-style={d.portStyle}
        data-module-id={m.id}
        style={
          {
            left: m.x,
            top: m.y,
            width: d.width,
            height: MODULE_HEIGHT,
            '--accent': d.color,
            '--panel': d.panel,
          } as CSSProperties
        }
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <i className="screw tl" />
        <i className="screw tr" />
        <i className="screw bl" />
        <i className="screw br" />
        <header
          className="module-heading"
          title={locked ? undefined : 'Drag to move'}
          onPointerDown={locked ? undefined : onMove}
        >
          <span className="module-mark">{d.mark}</span>
          <h2>{d.name}</h2>
          <span className="module-subtitle">{d.subtitle}</span>
        </header>
        {!locked && (
          <button
            className="module-remove"
            aria-label={`Remove ${d.name} module`}
            title="Remove module"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <Trash2 size={12} aria-hidden="true" />
          </button>
        )}
        <div className="controls">
          <Panel />
        </div>
        {d.inputs.map((port) => renderPort(port, 'in'))}
        {d.outputs.map((port) => renderPort(port, 'out'))}
        <span className="panel-footer">{d.footer ?? 'MODULAR'}</span>
      </section>
    </ModuleControlsProvider>
  );
}
