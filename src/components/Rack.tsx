'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Minus, Maximize2, X } from 'lucide-react';
import {
  DEFINITIONS,
  MAX_MODULES,
  MODULE_HEIGHT,
  ROW_HEIGHT,
  LEFT,
  TOP,
  createModule,
  patchModules,
  starterPatch,
  type Patch,
  type ModuleType,
  type RackModule,
  type Port,
} from '@/lib/modules';
import { restoreRack, saveRack } from '@/lib/storage';
import { startSampleMaintenance } from '@/lib/sample-maintenance';
import { AudioEngine } from '@/lib/audio';
import { MODULES } from '@/modules/registry.generated';
import type { DisplayState } from '@/modules/types';
import { Jack } from './rack/Jack';
import { CableLayer, portPoint } from './rack/CableLayer';
import { ModuleHost } from './rack/ModuleHost';
import { JackScope } from './rack/JackScope';
import { ModulePicker } from './rack/ModulePicker';
import { TransportBar } from './rack/TransportBar';
import { placeModule } from '@/lib/placement';
import {
  beginCable,
  finishCable,
  sameEnd,
  type CableEnd as End,
  type PendingCable,
} from '@/lib/patching';
import type { ProbeAnchor, ScopeFrame } from '@/lib/scope';

type Point = { x: number; y: number };
type AddMenu = Point & { screenX: number; screenY: number };
export default function Rack() {
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const [probe, setProbe] = useState<ProbeAnchor | null>(null),
    [scopeFrame, setScopeFrame] = useState<ScopeFrame | null>(null);
  const [patch, setPatch] = useState<Patch | null>(null);
  const [running, setRunning] = useState(false),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(true);
  const [recording, setRecording] = useState(false),
    [recordSeconds, setRecordSeconds] = useState(0);
  const outputRef = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState<Record<string, DisplayState>>({});
  const [menu, setMenu] = useState<AddMenu | null>(null),
    [wire, setWire] = useState<PendingCable | null>(null),
    [cursor, setCursor] = useState<Point>({ x: 0, y: 0 });
  const [notice, setNotice] = useState('');
  const [windowSize, setWindowSize] = useState({ width: 1100, height: 800 });
  const current = useRef<Patch | null>(null),
    audio = useRef<AudioEngine | null>(null),
    surface = useRef<HTMLDivElement>(null),
    viewport = useRef<HTMLDivElement>(null);
  const undo = useRef<Patch[]>([]),
    redo = useRef<Patch[]>([]),
    wireRef = useRef<PendingCable | null>(null);
  const wirePointer = useRef<{ id: number; start: End; started: boolean } | null>(null);
  const skipPatchClick = useRef(false);
  const drag = useRef<{ id: string; origin: Point; pointer: Point } | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    storageAvailable = useRef(true);
  const notify = useCallback((text: string) => {
    setNotice(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 4000);
  }, []);
  const replace = useCallback((next: Patch) => {
    current.current = next;
    setPatch(next);
  }, []);
  const update = useCallback(
    (fn: (p: Patch) => Patch) => {
      if (current.current) replace(fn(current.current));
    },
    [replace],
  );
  const remember = useCallback(() => {
    if (current.current) {
      undo.current.push(structuredClone(current.current));
      if (undo.current.length > 60) undo.current.shift();
      redo.current = [];
    }
  }, []);
  const change = useCallback(
    (fn: (p: Patch) => Patch) => {
      remember();
      update(fn);
    },
    [remember, update],
  );
  const selectWire = useCallback((pending: PendingCable | null) => {
    wireRef.current = pending;
    setWire(pending);
    if (!pending) wirePointer.current = null;
  }, []);
  const undoAction = useCallback(() => {
    const p = undo.current.pop();
    if (p && current.current) {
      redo.current.push(current.current);
      replace(p);
      selectWire(null);
    }
  }, [replace, selectWire]);
  const redoAction = useCallback(() => {
    const p = redo.current.pop();
    if (p && current.current) {
      undo.current.push(current.current);
      replace(p);
      selectWire(null);
    }
  }, [replace, selectWire]);
  useEffect(() => {
    const resize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  useEffect(() => {
    let disposed = false;
    const engine = new AudioEngine();
    audio.current = engine;
    engine.onState = setDisplay;
    engine.onScope = setScopeFrame;
    engine.onError = notify;
    engine.onRecordingProgress = setRecordSeconds;
    engine.onRecordingComplete = (blob, reason) => {
      setRecording(false);
      if (blob.size <= 44) {
        notify('No audio captured.');
        return;
      }
      const url = URL.createObjectURL(blob),
        link = document.createElement('a');
      link.href = url;
      link.download = `ostra-${new Date().toISOString().replace(/[:.]/g, '-')}.wav`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      notify(
        reason === 'limit'
          ? 'Recording limit reached. WAV downloaded.'
          : reason === 'stopped'
            ? 'WAV downloaded.'
            : 'Recording interrupted. Captured audio downloaded.',
      );
    };
    engine.onStopped = () => {
      setRunning(false);
      setDisplay({});
      setScopeFrame(null);
    };
    const samples = startSampleMaintenance(
      () => [...(current.current ? [current.current] : []), ...undo.current, ...redo.current],
      () => localStorage,
    );
    void samples.ready.then(() => {
      if (disposed) return;
      let p: Patch;
      try {
        const result = restoreRack(localStorage);
        p = result.patch;
        if (result.recovered) notify('Saved rack recovered. Previous data kept as a backup.');
      } catch {
        p = starterPatch();
        storageAvailable.current = false;
        setSaved(false);
        notify('Browser storage is unavailable. Changes cannot be saved.');
      }
      replace(p);
      void samples.sweep();
    });
    const flush = () => {
      if (current.current && storageAvailable.current)
        try {
          saveRack(localStorage, current.current);
        } catch {}
    };
    window.addEventListener('pagehide', flush);
    return () => {
      disposed = true;
      flush();
      samples.close();
      window.removeEventListener('pagehide', flush);
      void engine.close();
    };
  }, [notify, replace]);
  useEffect(() => {
    if (!patch) return;
    audio.current?.update(patch);
    if (!storageAvailable.current) return;
    setSaved(false);
    const timer = setTimeout(() => {
      try {
        saveRack(localStorage, patch);
        setSaved(true);
      } catch {
        notify('Rack could not be saved: browser storage is full or disabled.');
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [patch, notify]);
  useEffect(() => {
    setScopeFrame(null);
    audio.current?.probe(probe);
  }, [probe]);
  useEffect(() => {
    setProbe(null);
    setHoveredModule(null);
  }, [patch?.zoom, windowSize.width, windowSize.height]);
  useEffect(() => {
    if (!probe || !patch) return;
    const module = patchModules(patch).find((m) => m.id === probe.id);
    const available =
      module &&
      (probe.direction === 'out'
        ? DEFINITIONS[module.type].outputs.some((p) => p.id === probe.port)
        : patch.cables.some((c) => c.to === probe.id && c.toPort === probe.port));
    if (!available) setProbe(null);
  }, [patch, probe]);
  useEffect(() => {
    if (wire?.cableId && !patch?.cables.some((c) => c.id === wire.cableId)) selectWire(null);
  }, [patch, wire, selectWire]);
  const toggleAudio = useCallback(async () => {
    if (!current.current || busy) return;
    setBusy(true);
    try {
      if (running) {
        await audio.current?.stop();
        setRunning(false);
      } else {
        await audio.current?.start(current.current);
        setRunning(true);
      }
    } catch (e) {
      notify(`Could not start audio: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setBusy(false);
    }
  }, [running, busy, notify]);
  const stopAudio = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await audio.current?.stop();
      await audio.current?.close();
      setRunning(false);
      setDisplay({});
      setScopeFrame(null);
      setRecordSeconds(0);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not stop audio.');
    } finally {
      setBusy(false);
    }
  };
  const toggleRecording = async () => {
    if (busy || !current.current) return;
    setBusy(true);
    try {
      if (recording) await audio.current?.stopRecording();
      else {
        if (!running) {
          await audio.current?.start(current.current);
          setRunning(true);
        }
        audio.current?.startRecording();
        setRecordSeconds(0);
        setRecording(true);
      }
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not record audio.');
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!recording) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [recording]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) return;
      if (e.key === 'Escape') {
        setMenu(null);
        selectWire(null);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? redoAction() : undoAction();
        return;
      }
      if (e.code === 'Space' && el === document.body) {
        e.preventDefault();
        void toggleAudio();
      }
      if (e.key.toLowerCase() === 'a' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setProbe(null);
        setMenu({ x: LEFT, y: TOP + ROW_HEIGHT, screenX: 100, screenY: 100 });
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [undoAction, redoAction, toggleAudio, selectWire]);
  const connect = useCallback(
    (end: End) => {
      const pending = wireRef.current,
        p = current.current;
      if (!pending || !p || pending.fixed.direction === end.direction) return;
      const next = finishCable(p, pending, end);
      if (next) change(() => next);
      selectWire(null);
    },
    [change, selectWire],
  );
  const startWire = (end: End, point: Point, additional = false) => {
    if (!current.current) return;
    selectWire(beginCable(current.current, end, additional));
    setCursor(point);
    setMenu(null);
  };
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const p = current.current,
        rect = surface.current?.getBoundingClientRect();
      if (p && rect && wireRef.current)
        setCursor({ x: (e.clientX - rect.left) / p.zoom, y: (e.clientY - rect.top) / p.zoom });
      if (drag.current && e.buttons === 0) drag.current = null;
      if (drag.current && p) {
        const d = drag.current;
        update((p) => ({
          ...p,
          modules: p.modules.map((m) =>
            m.id === d.id
              ? {
                  ...m,
                  x: Math.max(
                    LEFT,
                    Math.min(8000, d.origin.x + (e.clientX - d.pointer.x) / p.zoom),
                  ),
                  y: Math.max(
                    TOP,
                    Math.min(21000, d.origin.y + (e.clientY - d.pointer.y) / p.zoom),
                  ),
                }
              : m,
          ),
        }));
      }
    };
    const up = (e: PointerEvent) => {
      if (drag.current) {
        // Snapping can move the module away from the pointer, causing the browser
        // to target its trailing click at the canvas instead of the module.
        skipPatchClick.current = true;
        const d = drag.current;
        update((p) => {
          const m = p.modules.find((m) => m.id === d.id);
          if (!m) return p;
          const right = Math.max(
            1100,
            (viewport.current?.clientWidth || 1100) / p.zoom,
            ...p.modules
              .filter((n) => n.id !== m.id)
              .map((n) => n.x + DEFINITIONS[n.type].width + LEFT),
          );
          const { x, y } = placeModule(p.modules, DEFINITIONS[m.type].width, m, right, m.id);
          return { ...p, modules: p.modules.map((n) => (n.id === m.id ? { ...n, x, y } : n)) };
        });
        drag.current = null;
      }
      if (e.type === 'pointercancel') {
        selectWire(null);
        return;
      }
      if (e.button !== 0) return;
      const gesture = wirePointer.current;
      wirePointer.current = null;
      if (!gesture || gesture.id !== e.pointerId || !wireRef.current) return;
      const el = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest<HTMLElement>('[data-port]');
      if (el) {
        const end: End = {
          module: el.dataset.module!,
          port: el.dataset.port!,
          direction: el.dataset.direction! as 'in' | 'out',
        };
        // The first click picks up an endpoint; its own pointer-up must not drop it.
        if (
          (!gesture.started || !sameEnd(gesture.start, end)) &&
          wireRef.current.fixed.direction !== end.direction
        ) {
          connect(end);
          skipPatchClick.current = true;
        }
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [update, connect, selectWire]);
  const setParam = (id: string, key: string, value: number) =>
    update((p) => ({
      ...p,
      output:
        p.output?.id === id
          ? { ...p.output, params: { ...p.output.params, [key]: value } }
          : p.output,
      modules: p.modules.map((m) =>
        m.id === id ? { ...m, params: { ...m.params, [key]: value } } : m,
      ),
    }));
  const removeModule = (id: string) => {
    change((p) => ({
      ...p,
      modules: p.modules.filter((m) => m.id !== id),
      cables: p.cables.filter((c) => c.from !== id && c.to !== id),
    }));
    selectWire(null);
    notify('Module removed');
  };
  const addModule = (type: ModuleType) => {
    const p = current.current;
    if (!p || !menu) return;
    if (p.modules.length >= MAX_MODULES) {
      notify(`Rack full: ${MAX_MODULES} modules`);
      return;
    }
    const right = Math.max(
      1100,
      (viewport.current?.clientWidth || 1100) / p.zoom,
      ...p.modules.map((m) => m.x + DEFINITIONS[m.type].width + LEFT),
    );
    const { x, y } = placeModule(p.modules, DEFINITIONS[type].width, menu, right);
    change((p) => ({ ...p, modules: [...p.modules, createModule(type, x, y)] }));
    setMenu(null);
  };
  const openMenu = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.module,.cable,.add-menu,.dock')) return;
    if (wireRef.current) {
      selectWire(null);
      return;
    }
    const rect = surface.current?.getBoundingClientRect();
    if (!rect || !current.current) return;
    setProbe(null);
    setMenu({
      x: (e.clientX - rect.left) / current.current.zoom,
      y: (e.clientY - rect.top) / current.current.zoom,
      screenX: e.clientX,
      screenY: e.clientY,
    });
  };
  const inspectJack = (
    m: RackModule,
    p: Port,
    direction: 'in' | 'out',
    element: HTMLElement,
    color?: string,
  ) => {
    if (direction === 'in' && !color) {
      setProbe(null);
      return;
    }
    const rect = element.getBoundingClientRect();
    setProbe({
      id: m.id,
      port: p.id,
      direction,
      key: `${m.id}:${direction}:${p.id}`,
      label: `${m.id === patch?.output?.id ? 'MASTER' : DEFINITIONS[m.type].name} · ${p.label} ${direction.toUpperCase()}`,
      color: color ?? DEFINITIONS[m.type].panel,
      x: rect.right,
      y: rect.top + rect.height / 2,
    });
  };
  if (!patch || !patch.output) return <main className="rack-loading" />;
  const contentWidth = Math.max(
    1100,
    ...patch.modules.map((m) => m.x + DEFINITIONS[m.type].width + LEFT),
  );
  const width = Math.max(contentWidth, windowSize.width / patch.zoom);
  const height = Math.max(
    1250,
    windowSize.height / patch.zoom,
    ...patch.modules.map((m) => m.y + MODULE_HEIGHT + ROW_HEIGHT),
  );
  const renderPort = (m: RackModule, p: Port, direction: 'in' | 'out') => {
    const fixed = m.id === patch.output?.id;
    const point = fixed ? { x: 0, y: 0 } : portPoint(m, p.id, direction);
    const wirePoint = (element: HTMLElement) => {
      if (!fixed) return point;
      const jack = element.getBoundingClientRect(),
        canvas = surface.current!.getBoundingClientRect();
      return {
        x: (jack.left + jack.width / 2 - canvas.left) / patch.zoom,
        y: (jack.top + jack.height / 2 - canvas.top) / patch.zoom,
      };
    };
    const connectedCable = [...patch.cables]
      .reverse()
      .find((c) =>
        direction === 'in'
          ? c.to === m.id && c.toPort === p.id
          : c.from === m.id && c.fromPort === p.id,
      );
    const cableColor = connectedCable?.color;
    const visibleCable = [...patch.cables]
      .reverse()
      .find(
        (c) =>
          c.id !== wire?.cableId &&
          (direction === 'in'
            ? c.to === m.id && c.toPort === p.id
            : c.from === m.id && c.fromPort === p.id),
      );
    const end = { module: m.id, port: p.id, direction };
    const active = !!wire && sameEnd(wire.fixed, end);
    return (
      <Jack
        key={`${direction}-${p.id}`}
        port={p}
        direction={direction}
        moduleId={m.id}
        moduleName={fixed ? 'Master' : DEFINITIONS[m.type].name}
        x={fixed ? (p.id === 'right' ? 80 : 28) : point.x - m.x}
        y={fixed ? 25 : point.y - m.y}
        color={visibleCable?.color}
        connected={!!connectedCable}
        active={active}
        onPointerEnter={(e) => inspectJack(m, p, direction, e.currentTarget, cableColor)}
        onPointerLeave={() => setProbe(null)}
        onFocus={(e) => inspectJack(m, p, direction, e.currentTarget, cableColor)}
        onBlur={() => setProbe(null)}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          const started = !wireRef.current;
          if (started) startWire(end, wirePoint(e.currentTarget), e.shiftKey);
          wirePointer.current = { id: e.pointerId, start: end, started };
        }}
        onClick={(e) => {
          // Pointer gestures finish on window pointer-up; native keyboard/AT clicks do not.
          if (e.detail !== 0) return;
          wireRef.current ? connect(end) : startWire(end, wirePoint(e.currentTarget), e.shiftKey);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          change((patch) => ({
            ...patch,
            cables: patch.cables.filter((c) =>
              direction === 'in'
                ? !(c.to === m.id && c.toPort === p.id)
                : !(c.from === m.id && c.fromPort === p.id),
            ),
          }));
          selectWire(null);
        }}
      />
    );
  };
  const cableProps = {
    patch,
    hoveredModule,
    probe,
    wire,
    cursor,
    surface,
    viewport,
    output: outputRef,
    onRemove: (id: string) =>
      change((p) => ({ ...p, cables: p.cables.filter((c) => c.id !== id) })),
  };
  return (
    <main className="rack-app">
      <TransportBar
        running={running}
        busy={busy}
        recording={recording}
        seconds={recordSeconds}
        saved={saved}
        output={patch.output}
        outputRef={outputRef}
        onPlay={() => void toggleAudio()}
        onStop={() => void stopAudio()}
        onRecord={() => void toggleRecording()}
        onBegin={remember}
        onLevel={(value) => setParam(patch.output!.id, 'level', value)}
        onMute={() => {
          remember();
          setParam(patch.output!.id, 'mute', patch.output!.params.mute ? 0 : 1);
        }}
        onHover={(hovered) => setHoveredModule(hovered ? patch.output!.id : null)}
        renderPort={(port) => renderPort(patch.output!, port, 'in')}
      />
      <div
        className="canvas-viewport"
        ref={viewport}
        onScroll={() => {
          setMenu(null);
          setProbe(null);
          setHoveredModule(null);
        }}
      >
        <div
          className="canvas-size"
          style={{ width: width * patch.zoom, height: height * patch.zoom, minWidth: '100%' }}
        >
          <div
            className="canvas"
            data-dragging={!!drag.current}
            ref={surface}
            style={{ width, height, transform: `scale(${patch.zoom})` }}
            onClick={openMenu}
            onPointerDownCapture={() => {
              skipPatchClick.current = false;
            }}
            onClickCapture={(e) => {
              if (skipPatchClick.current && e.detail !== 0) {
                skipPatchClick.current = false;
                e.stopPropagation();
              }
            }}
            onPointerMoveCapture={(e) => {
              const rect = e.currentTarget.getBoundingClientRect(),
                x = (e.clientX - rect.left) / patch.zoom,
                y = (e.clientY - rect.top) / patch.zoom;
              const hit = [...patch.modules]
                .reverse()
                .find(
                  (m) =>
                    x >= m.x &&
                    x <= m.x + DEFINITIONS[m.type].width &&
                    y >= m.y &&
                    y <= m.y + MODULE_HEIGHT,
                );
              setHoveredModule(hit?.id ?? null);
            }}
            onPointerLeave={() => {
              setHoveredModule(null);
              setProbe(null);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu(null);
              selectWire(null);
            }}
          >
            {Array.from({ length: Math.ceil(height / ROW_HEIGHT) }, (_, i) => (
              <div className="rack-row" key={i} style={{ top: TOP - 18 + i * ROW_HEIGHT }}>
                <div className="rail top" />
                <div className="rail bottom" />
                <span className="row-number">{String(i + 1).padStart(2, '0')}</span>
              </div>
            ))}
            <CableLayer {...cableProps} width={width} height={height} />
            {patch.modules.map((m) => (
              <ModuleHost
                key={m.id}
                plugin={MODULES[m.type]}
                controls={{
                  module: m,
                  definition: DEFINITIONS[m.type],
                  running,
                  display: display[m.id] ?? {},
                  beginEdit: remember,
                  setParam: (key, value) => setParam(m.id, key, value),
                  setData: (data) =>
                    update((p) => ({
                      ...p,
                      modules: p.modules.map((n) => (n.id === m.id ? { ...n, data } : n)),
                    })),
                  trigger: (event) => {
                    if (running) audio.current?.trigger(m.id, event);
                    else notify('Start audio transport to use the manual clock controls.');
                  },
                }}
                onMove={(e) => {
                  if (e.button !== 0) return;
                  e.preventDefault();
                  skipPatchClick.current = true;
                  setProbe(null);
                  selectWire(null);
                  remember();
                  drag.current = {
                    id: m.id,
                    origin: { x: m.x, y: m.y },
                    pointer: { x: e.clientX, y: e.clientY },
                  };
                  setMenu(null);
                }}
                onRemove={() => removeModule(m.id)}
                renderPort={(port, direction) => renderPort(m, port, direction)}
              />
            ))}
          </div>
        </div>
      </div>
      <CableLayer {...cableProps} screen width={windowSize.width} height={windowSize.height} />
      <div className="dock zoom-dock">
        <button
          aria-label="Zoom out"
          title="Zoom out"
          onClick={() => update((p) => ({ ...p, zoom: Math.max(0.5, p.zoom - 0.1) }))}
        >
          <Minus size={14} />
        </button>
        <span>{Math.round(patch.zoom * 100)}%</span>
        <button
          aria-label="Zoom in"
          title="Zoom in"
          onClick={() => update((p) => ({ ...p, zoom: Math.min(1.5, p.zoom + 0.1) }))}
        >
          <Plus size={14} />
        </button>
        <button
          aria-label="Fit rack"
          title="Fit rack"
          onClick={() =>
            update((p) => ({
              ...p,
              zoom: Math.max(
                0.5,
                Math.min(1, (viewport.current?.clientWidth || 1100) / contentWidth),
              ),
            }))
          }
        >
          <Maximize2 size={13} />
        </button>
      </div>
      {menu && (
        <ModulePicker
          x={menu.screenX}
          y={menu.screenY}
          onSelect={addModule}
          onClose={() => setMenu(null)}
        />
      )}
      {probe && (
        <JackScope
          key={probe.key}
          probe={probe}
          frame={scopeFrame}
          running={running}
          viewport={windowSize}
        />
      )}
      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          {notice === 'Module removed' && (
            <button
              onClick={() => {
                undoAction();
                setNotice('');
              }}
            >
              Undo
            </button>
          )}
          <button aria-label="Dismiss" onClick={() => setNotice('')}>
            <X size={12} />
          </button>
        </div>
      )}
    </main>
  );
}
