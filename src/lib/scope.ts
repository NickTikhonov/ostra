export type ProbeTarget = { id: string; port: string; direction: 'in' | 'out'; key: string };
export type ScopeTrace = { min: number[]; max: number[]; seconds: number; window: number };
export type ScopeFrame = { key: string; current: number; slow: ScopeTrace };
export type ProbeAnchor = ProbeTarget & { label: string; color: string; x: number; y: number };
