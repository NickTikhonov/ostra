// @ts-check
/** @typedef {import('../modules/types').ModuleDefinition} ModuleDefinition */
/** @typedef {import('../modules/types').AudioAsset} AudioAsset */
/** @typedef {import('../lib/scope').ProbeTarget} ProbeTarget */
// State is opaque to the host. Each processor checks its concrete state type
// with ModuleProcessor<State>; heterogeneous instances share this registry.
/** @typedef {{definition:ModuleDefinition,processor:import('../modules/types').ModuleProcessor<any>}} RuntimePlugin */
/** @typedef {{id:string,type:string,processor:RuntimePlugin['processor'],targets:Record<string,number>,previous:Record<string,number>,connections:Record<string,{source:RuntimeModule,port:string,delayed:boolean}>,inputKeys:string[],outputKeys:string[],paramDefs:import('../modules/types').Param[],context:import('../modules/types').ProcessorContext<any>}} RuntimeModule */
import { AUDIO_MODULES } from '../modules/audio.generated.js';
import { VoltageProbe } from './scope.js';

// The host owns graph ordering and smoothing. All module-specific behavior lives
// in the registry's processors, including state, extra saved data and telemetry.
export class RackEngine {
  /** @param {number} sampleRate @param {Record<string,RuntimePlugin>} registry */
  constructor(sampleRate = 48000, registry = AUDIO_MODULES) {
    this.sampleRate = sampleRate;
    this.registry = registry;
    /** @type {RuntimeModule[]} */
    this.modules = [];
    /** @type {RuntimeModule | null} */
    this.activeModule = null;
    /** @type {Map<string,RuntimeModule>} */
    this.byId = new Map();
    /** @type {Map<string,AudioAsset>} */
    this.assets = new Map();
    this.smoothing = 1 - Math.exp(-1 / (sampleRate * 0.008));
    this.probe = new VoltageProbe(sampleRate);
    /** @type {ProbeTarget | null} */
    this.probeTarget = null;
    /** @type {RuntimeModule | null} */
    this.probeModule = null;
  }

  /** @param {import('../lib/modules').Patch} patch */
  setPatch(patch) {
    /** @type {Map<string,RuntimeModule>} */
    const next = new Map();
    for (const data of patch.output ? [...patch.modules, patch.output] : patch.modules) {
      const plugin = this.registry[data.type];
      if (!plugin) continue;
      const { definition, processor } = plugin;
      // Identify initialization failures before an instance exists.
      this.activeModule = null;
      let m = this.byId.get(data.id);
      if (!m || m.type !== data.type) {
        const params = Object.fromEntries(
          definition.params.map((p) => [p.id, data.params[p.id] ?? p.default]),
        );
        m = {
          id: data.id,
          type: data.type,
          processor,
          targets: {},
          previous: {},
          connections: {},
          inputKeys: definition.inputs.map((p) => p.id),
          outputKeys: definition.outputs.map((p) => p.id),
          paramDefs: definition.params,
          context: {
            sampleRate: this.sampleRate,
            params,
            inputs: Object.fromEntries(definition.inputs.map((p) => [p.id, 0])),
            connected: {},
            outputConnected: {},
            outputs: Object.fromEntries(definition.outputs.map((p) => [p.id, 0])),
            state: processor.createState(this.sampleRate, data.id),
            data: {},
            stereo: { left: 0, right: 0 },
          },
        };
      }
      m.targets = Object.fromEntries(
        definition.params.map((p) => {
          const value = data.params[p.id];
          return [
            p.id,
            Number.isFinite(value) ? Math.max(p.min, Math.min(p.max, value)) : p.default,
          ];
        }),
      );
      m.context.data = definition.restoreData?.(data) ?? definition.createData?.() ?? {};
      m.context.asset = this.assets.get(String(m.context.data.assetId ?? '')) ?? null;
      m.connections = {};
      m.context.connected = Object.fromEntries(m.inputKeys.map((id) => [id, false]));
      m.context.outputConnected = Object.fromEntries(m.outputKeys.map((id) => [id, false]));
      next.set(m.id, m);
    }
    // Feed-forward connections use this sample. Back edges read the last sample.
    const seen = new Set(),
      visiting = new Set();
    /** @type {RuntimeModule[]} */
    const ordered = [];
    /** @param {string} id */
    const visit = (id) => {
      if (seen.has(id) || visiting.has(id)) return;
      visiting.add(id);
      for (const cable of patch.cables)
        if (cable.to === id && next.has(cable.from)) visit(cable.from);
      visiting.delete(id);
      seen.add(id);
      ordered.push(/** @type {RuntimeModule} */ (next.get(id)));
    };
    for (const id of next.keys()) visit(id);
    const order = new Map(ordered.map((m, i) => [m.id, i]));
    for (const cable of patch.cables) {
      const to = next.get(cable.to),
        from = next.get(cable.from);
      if (
        !to ||
        !from ||
        !to.inputKeys.includes(cable.toPort) ||
        !from.outputKeys.includes(cable.fromPort)
      )
        continue;
      to.connections[cable.toPort] = {
        source: from,
        port: cable.fromPort,
        delayed: (order.get(cable.from) ?? 0) >= (order.get(cable.to) ?? 0),
      };
      to.context.connected[cable.toPort] = true;
      from.context.outputConnected[cable.fromPort] = true;
    }
    this.modules = ordered;
    this.byId = next;
    this.bindProbe();
  }

  /** @param {Float32Array} left @param {Float32Array} right */
  render(left, right) {
    for (let i = 0; i < left.length; i++) {
      let l = 0,
        r = 0;
      for (const m of this.modules) {
        const ctx = m.context;
        for (const param of m.paramDefs) {
          const target = m.targets[param.id];
          ctx.params[param.id] =
            param.smooth === false
              ? target
              : ctx.params[param.id] + (target - ctx.params[param.id]) * this.smoothing;
        }
        for (const key of m.inputKeys) {
          const wire = m.connections[key];
          ctx.inputs[key] = wire
            ? (wire.delayed
                ? wire.source.previous[wire.port]
                : wire.source.context.outputs[wire.port]) || 0
            : 0;
        }
        this.activeModule = m;
        m.processor.process(ctx);
        // A bad output cannot propagate NaNs through the graph.
        for (const key of m.outputKeys)
          if (!Number.isFinite(ctx.outputs[key])) ctx.outputs[key] = 0;
        if (m === this.probeModule && this.probeTarget)
          this.probe.capture(
            ctx[this.probeTarget.direction === 'in' ? 'inputs' : 'outputs'][this.probeTarget.port],
          );
        if (m.processor.audioOutput) {
          l += ctx.stereo.left;
          r += ctx.stereo.right;
        }
      }
      left[i] = Number.isFinite(l) ? Math.tanh(l) : 0;
      right[i] = Number.isFinite(r) ? Math.tanh(r) : 0;
      for (const m of this.modules)
        for (const key of m.outputKeys) m.previous[key] = m.context.outputs[key];
    }
  }

  /** @param {string} id @param {string} event */
  dispatch(id, event) {
    const m = this.byId.get(id);
    this.activeModule = m ?? null;
    m?.processor.onEvent?.(m.context, event);
  }

  /** @param {string} id @param {AudioAsset | null} asset */
  setAsset(id, asset) {
    if (asset) this.assets.set(id, asset);
    else this.assets.delete(id);
    for (const m of this.modules) if (m.context.data.assetId === id) m.context.asset = asset;
  }

  /** @param {ProbeTarget | null} target */
  setProbe(target) {
    if (target?.key !== this.probeTarget?.key) this.probe.reset();
    this.probeTarget = target;
    this.bindProbe();
  }
  bindProbe() {
    const target = this.probeTarget,
      m = target ? this.byId.get(target.id) : null;
    // Observing an output must not mark it patched: some processors use that
    // flag to change their internal summing/normalled routing.
    const available =
      m &&
      target &&
      (target.direction === 'in'
        ? m.context.connected[target.port]
        : m.outputKeys.includes(target.port));
    this.probeModule = available ? m : null;
  }
  getProbeFrame() {
    return this.probeModule
      ? this.probe.frame(/** @type {ProbeTarget} */ (this.probeTarget).key)
      : null;
  }

  getDisplayState() {
    /** @type {Record<string,import('../modules/types').DisplayState>} */
    const display = {};
    for (const m of this.modules)
      if (m.processor.getDisplayState) {
        this.activeModule = m;
        display[m.id] = m.processor.getDisplayState(m.context.state);
      }
    return display;
  }
}
