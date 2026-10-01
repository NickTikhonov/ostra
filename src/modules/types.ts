import type { ComponentType } from 'react';

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type ModuleData = Record<string, JsonValue>;
export type DisplayState = Record<string, number | boolean>;
/** Large audio data lives in IndexedDB and reaches DSP separately from JSON patches. */
export type AudioAsset = { sampleRate: number; channels: Float32Array[] };
/** Socket centres in local panel pixels. The same geometry anchors cables and scopes. */
export type Port = {
  id: string;
  label: string;
  kind: 'audio' | 'cv' | 'gate';
  x: number;
  y: number;
  labelPosition?: 'above' | 'below';
};
export type Param = {
  id: string;
  label: string;
  min: number;
  max: number;
  default: number;
  unit?: string;
  log?: boolean;
  step?: number;
  smooth?: boolean;
};
export type ModuleDefinition = {
  type: string;
  version: number;
  name: string;
  subtitle: string;
  mark?: string;
  footer?: string;
  color: string;
  panel: string;
  width: number;
  layout?: 'faceplate' | 'studio';
  headerLayout?: 'standard' | 'compact';
  /** Optional output markings only; the host never imposes a patch-bay layout. */
  portStyle?: 'plain' | 'badge';
  category?: string;
  order?: number;
  hidden?: boolean;
  reference?: string;
  inputs: Port[];
  outputs: Port[];
  params: Param[];
  createData?: () => ModuleData;
  /** Validate current data or migrate an older serialized instance. */
  restoreData?: (saved: Record<string, unknown>) => ModuleData;
};
export type ModuleInstance = {
  id: string;
  type: string;
  version: number;
  x: number;
  y: number;
  params: Record<string, number>;
  data: ModuleData;
};
export type ModulePlugin = {
  definition: ModuleDefinition;
  Panel: ComponentType;
  className?: string;
};
/** Created once per instance; reused for every audio sample. No React or browser APIs. */
export type ProcessorContext<State> = {
  sampleRate: number;
  params: Record<string, number>;
  inputs: Record<string, number>;
  connected: Record<string, boolean>;
  outputConnected: Record<string, boolean>;
  outputs: Record<string, number>;
  state: State;
  data: ModuleData;
  stereo: { left: number; right: number };
  asset?: AudioAsset | null;
};
export type ModuleProcessor<State> = {
  createState: (sampleRate: number, id: string) => State;
  process: (context: ProcessorContext<State>) => void;
  onEvent?: (context: ProcessorContext<State>, event: string) => void;
  /** Only output modules opt in to sending samples to the speakers. */
  audioOutput?: boolean;
  /** Called at UI rate, never per sample. */
  getDisplayState?: (state: State) => DisplayState;
};
