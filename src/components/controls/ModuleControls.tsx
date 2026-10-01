'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { DisplayState, ModuleData, ModuleDefinition, ModuleInstance } from '@/modules/types';
import { Knob } from './Knob';
import { Switch } from './Switch';

export type ModuleControls = {
  module: ModuleInstance;
  definition: ModuleDefinition;
  running: boolean;
  display: DisplayState;
  beginEdit: () => void;
  setParam: (id: string, value: number) => void;
  setData: (data: ModuleData) => void;
  trigger: (event: string) => void;
};
const Context = createContext<ModuleControls | null>(null);
export function ModuleControlsProvider({
  value,
  children,
}: {
  value: ModuleControls;
  children: ReactNode;
}) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useModule() {
  const context = useContext(Context);
  if (!context) throw new Error('Module controls must be rendered inside a ModuleHost.');
  return context;
}
function useParameter(id: string) {
  const context = useModule();
  const param = context.definition.params.find((p) => p.id === id);
  if (!param) throw new Error(`Unknown parameter ${context.definition.type}.${id}`);
  return { ...context, param };
}
export function ModuleKnob({ id, large = false }: { id: string; large?: boolean }) {
  const { module, param, setParam, beginEdit } = useParameter(id);
  return (
    <Knob
      param={param}
      value={module.params[id]}
      large={large}
      onBegin={beginEdit}
      onChange={(value) => setParam(id, value)}
    />
  );
}
export function ModuleSwitch({
  id,
  label,
  ariaLabel,
  className,
}: {
  id: string;
  label?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const { module, param, setParam, beginEdit } = useParameter(id);
  return (
    <Switch
      label={label ?? param.label}
      ariaLabel={ariaLabel}
      className={className}
      value={module.params[id] >= 0.5}
      onChange={(value) => {
        beginEdit();
        setParam(id, value ? 1 : 0);
      }}
    />
  );
}
