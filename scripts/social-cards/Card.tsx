'use client';

import { ModuleHost } from '@/components/rack/ModuleHost';
import { Jack } from '@/components/rack/Jack';
import { MODULES } from '@/modules/registry.generated';
import { cableCurve } from '@/lib/cable-motion';
import type { ModuleInstance } from '@/modules/types';
import styles from './card.module.css';

const noop = () => {};
const types = ['oscillator', 'filter', 'envelope'] as const;
const modules: ModuleInstance[] = types.map((type, index) => {
  const definition = MODULES[type].definition;
  return {
    id: type,
    type,
    version: definition.version,
    x: index * 242,
    y: 0,
    params: Object.fromEntries(definition.params.map((param) => [param.id, param.default])),
    data: {},
  };
});
const cables = [
  { from: 0, output: 'saw', to: 1, input: 'in', color: '#e77f50' },
  { from: 2, output: 'env', to: 1, input: 'vca', color: '#a193d5' },
];

/** Design source for the checked-in 1200 × 630 social images. No audio engine is mounted. */
export default function Card({ learn = false }: { learn?: boolean }) {
  const connections = learn ? cables.slice(0, 1) : cables;
  return (
    <main className={`${styles.card} ${learn ? styles.learn : styles.home}`}>
      <div className={styles.brand}>
        ostra<span>{learn ? '/ learn' : ''}</span>
      </div>
      <div className={styles.copy}>
        <div className={styles.eyebrow}>
          {learn ? 'AN INTERACTIVE TUTORIAL' : 'SOUND STARTS WITH A CONNECTION'}
        </div>
        <h1>
          {learn ? (
            <>
              Program your
              <br />
              first <em>synth.</em>
            </>
          ) : (
            <>
              A modular
              <br />
              <em>playground.</em>
            </>
          )}
        </h1>
        <p>
          {learn ? (
            <>
              Learn modular synthesis,
              <br />
              one connection at a time.
            </>
          ) : (
            <>
              Build your own musical instrument.
              <br />
              Right in your browser.
            </>
          )}
        </p>
      </div>
      <div className={styles.instrument}>
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
        <svg className="cables" width="750" height="500" aria-hidden="true">
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
              <g key={c.output}>
                <path className="cable-shadow" d={d} />
                <path d={d} stroke={c.color} strokeWidth="4.5" />
                <path className="cable-highlight" d={d} />
              </g>
            );
          })}
        </svg>
      </div>
      <div className={styles.address}>
        ostra.fm{learn ? '/learn' : ''}
        <span>↗</span>
      </div>
    </main>
  );
}
