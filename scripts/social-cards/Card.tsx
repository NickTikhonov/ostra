'use client';

import { ModuleHost } from '@/components/rack/ModuleHost';
import { Jack } from '@/components/rack/Jack';
import { MODULES } from '@/modules/registry.generated';
import { cableCurve } from '@/lib/cable-motion';
import type { ModuleDefinition, ModuleInstance } from '@/modules/types';
import styles from './card.module.css';

const noop = () => {};
const types = ['sequencer', 'oscillator', 'filter', 'maths'] as const;
const modules: ModuleInstance[] = types.map((type, index) => {
  const definition: ModuleDefinition = MODULES[type].definition;
  return {
    id: type,
    type,
    version: definition.version,
    x: types.slice(0, index).reduce((x, type) => x + MODULES[type].definition.width + 10, 0),
    y: 0,
    params: Object.fromEntries(definition.params.map((param) => [param.id, param.default])),
    data:
      type === 'sequencer'
        ? { ...definition.createData!(), rangeMin: -1, rangeMax: 2 }
        : (definition.createData?.() ?? {}),
  };
});
const rackWidth = modules.at(-1)!.x + MODULES[types.at(-1)!].definition.width;
// A clocked voice: VECTOR clocks PATH, which controls ORBIT's pitch and the envelope.
// The second function also modulates pulse width and filter frequency.
modules[3].params = { ...modules[3].params, cycle4: 1, att2: 0.18, rise4: 0.3, fall4: 0.5 };
const cables = [
  { from: 0, output: 'pitch', to: 1, input: 'pitch', color: '#dcab4f' },
  { from: 0, output: 'gate', to: 3, input: 'trig1', color: '#77ab9b' },
  { from: 1, output: 'saw', to: 2, input: 'in', color: '#e77f50' },
  { from: 3, output: 'ch1', to: 2, input: 'vca', color: '#b69cdc' },
  { from: 3, output: 'ch4', to: 2, input: 'cutoff', color: '#73b4c8' },
  { from: 3, output: 'eoc', to: 0, input: 'clock', color: '#dcab4f' },
  { from: 3, output: 'unity4', to: 1, input: 'pwm', color: '#d98c9d' },
  { from: 0, output: 'pitch', to: 3, input: 'in2', color: '#dcab4f' },
  { from: 3, output: 'ch2', to: 1, input: 'fm', color: '#77ab9b' },
];

/** Design source for the checked-in 1200 × 630 social images. No audio engine is mounted. */
export default function Card({ learn = false }: { learn?: boolean }) {
  const connections = cables;
  return (
    <main className={`${styles.card} ${learn ? styles.learn : styles.home}`}>
      <div className={styles.brand}>ostra</div>
      <div className={styles.instrument} style={{ width: rackWidth }}>
        <div className={styles.rail} />
        {types.map((type, index) => {
          const plugin = MODULES[type];
          const module = modules[index];
          return (
            <ModuleHost
              key={type}
              plugin={plugin}
              locked
              onMove={noop}
              onRemove={noop}
              controls={{
                module,
                definition: plugin.definition,
                running: false,
                display: {},
                beginEdit: noop,
                setParam: noop,
                setData: noop,
                trigger: noop,
              }}
              renderPort={(port, direction) => {
                const cable = connections.find((c) =>
                  direction === 'out'
                    ? c.from === index && c.output === port.id
                    : c.to === index && c.input === port.id,
                );
                return (
                  <Jack
                    key={`${direction}-${port.id}`}
                    port={port}
                    direction={direction}
                    moduleId={module.id}
                    moduleName={plugin.definition.name}
                    x={port.x}
                    y={port.y}
                    color={cable?.color}
                    connected={!!cable}
                    active={false}
                  />
                );
              }}
            />
          );
        })}
        <svg className="cables" width={rackWidth} height="550" aria-hidden="true">
          {connections.map((c) => {
            const output = MODULES[types[c.from]].definition.outputs.find(
              (p) => p.id === c.output,
            )!;
            const input = MODULES[types[c.to]].definition.inputs.find((p) => p.id === c.input)!;
            const d = cableCurve(
              { x: modules[c.from].x + output.x, y: output.y },
              { x: modules[c.to].x + input.x, y: input.y },
            );
            return (
              <g key={`${c.to}-${c.input}`}>
                <path className="cable-shadow" d={d} />
                <path d={d} stroke={c.color} strokeWidth="4.5" />
                <path className="cable-highlight" d={d} />
              </g>
            );
          })}
        </svg>
      </div>
    </main>
  );
}
