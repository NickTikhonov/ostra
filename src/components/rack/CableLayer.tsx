import { useId, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import {
  DEFINITIONS,
  MODULE_HEIGHT,
  patchModules,
  type Patch,
  type RackModule,
} from '@/lib/modules';
import type { PendingCable } from '@/lib/patching';
import type { ProbeAnchor } from '@/lib/scope';

type Point = { x: number; y: number };
export function portPoint(m: RackModule, port: string, direction: 'in' | 'out'): Point {
  const socket = DEFINITIONS[m.type][direction === 'in' ? 'inputs' : 'outputs'].find(
    (p) => p.id === port,
  )!;
  return { x: m.x + socket.x, y: m.y + socket.y };
}
function curve(a: Point, b: Point) {
  const sag = 42 + Math.min(115, Math.abs(a.x - b.x) * 0.17);
  return `M${a.x},${a.y} C${a.x},${a.y + sag} ${b.x},${b.y + sag} ${b.x},${b.y}`;
}

type Props = {
  screen?: boolean;
  patch: Patch;
  width: number;
  height: number;
  hoveredModule: string | null;
  probe: ProbeAnchor | null;
  wire: PendingCable | null;
  cursor: Point;
  surface: RefObject<HTMLDivElement | null>;
  viewport: RefObject<HTMLDivElement | null>;
  output: RefObject<HTMLDivElement | null>;
  onRemove: (id: string) => void;
};

/** Rack cables scroll natively with the panels. Only leads to the fixed toolbar
 * (and the loose cable under the pointer) need screen-space geometry. */
export function CableLayer({
  screen = false,
  patch,
  width,
  height,
  hoveredModule,
  probe,
  wire,
  cursor,
  surface,
  viewport,
  output,
  onRemove,
}: Props) {
  const id = useId().replace(/:/g, '');
  const svg = useRef<SVGSVGElement>(null);
  const modules = useMemo(() => patchModules(patch), [patch]);
  const cables = patch.cables.filter(
    (c) => c.id !== wire?.cableId && (c.to === patch.output?.id) === screen,
  );
  const holes = patch.modules
    .map(
      (m) =>
        `M${m.x - 3} ${m.y - 3}h${DEFINITIONS[m.type].width + 6}v${MODULE_HEIGHT + 6}h${-DEFINITIONS[m.type].width - 6}Z`,
    )
    .join(' ');

  useLayoutEffect(() => {
    if (!screen) return;
    const layer = svg.current,
      scroller = viewport.current,
      canvas = surface.current,
      master = output.current;
    if (!layer || !scroller || !canvas || !master) return;
    // Scroll geometry never goes through React state. Update the small
    // fixed-output overlay directly in the same event, without a second frame.
    const sync = () => {
      const rect = canvas.getBoundingClientRect();
      const top = scroller.getBoundingClientRect().top;
      // Read both fixed anchors before any SVG writes to avoid layout thrashing.
      const anchors = new Map<string, Point>();
      master.querySelectorAll<HTMLElement>('[data-port]').forEach((element) => {
        const jack = element.getBoundingClientRect();
        anchors.set(element.dataset.port!, {
          x: jack.left + jack.width / 2,
          y: jack.top + jack.height / 2,
        });
      });
      const project = (p: Point) => ({
        x: rect.left + p.x * patch.zoom,
        y: rect.top + p.y * patch.zoom,
      });
      const point = (m: RackModule, port: string, direction: 'in' | 'out') => {
        if (m.id !== patch.output?.id) return project(portPoint(m, port, direction));
        return anchors.get(port)!;
      };
      layer
        .querySelector('[data-projection]')!
        .setAttribute('transform', `translate(${rect.left} ${rect.top}) scale(${patch.zoom})`);
      layer.querySelector('[data-header]')!.setAttribute('height', String(top));
      // Clip interactive cable strokes to the rack and outside the panels.
      layer.querySelector('[data-hits]')!.setAttribute(
        'd',
        `M0 ${top}H${width}V${height}H0Z ` +
          patch.modules
            .map((m) => {
              const p = project({ x: m.x - 3, y: m.y - 3 });
              const bottom = Math.max(top, p.y + (MODULE_HEIGHT + 6) * patch.zoom);
              return `M${p.x} ${Math.max(top, p.y)}h${(DEFINITIONS[m.type].width + 6) * patch.zoom}V${bottom}h${(-DEFINITIONS[m.type].width - 6) * patch.zoom}Z`;
            })
            .join(' '),
      );
      layer.querySelectorAll<SVGGElement>('[data-cable]').forEach((group) => {
        const cable = patch.cables.find((c) => c.id === group.dataset.cable)!;
        const a = modules.find((m) => m.id === cable.from),
          b = modules.find((m) => m.id === cable.to);
        if (!a || !b) return;
        const start = point(a, cable.fromPort, 'out'),
          end = point(b, cable.toPort, 'in');
        group.querySelectorAll('path').forEach((path) => path.setAttribute('d', curve(start, end)));
        group.querySelectorAll('[data-plug]').forEach((plug) => {
          const p = plug.getAttribute('data-plug') === '0' ? start : end;
          plug.setAttribute('transform', `translate(${p.x} ${p.y})`);
        });
      });
      if (wire) {
        const m = modules.find((m) => m.id === wire.fixed.module);
        if (m)
          layer
            .querySelector('[data-pending]')
            ?.setAttribute(
              'd',
              curve(point(m, wire.fixed.port, wire.fixed.direction), project(cursor)),
            );
      }
    };
    sync();
    scroller.addEventListener('scroll', sync, { passive: true });
    const observer = new ResizeObserver(sync);
    observer.observe(scroller);
    observer.observe(master);
    return () => {
      scroller.removeEventListener('scroll', sync);
      observer.disconnect();
    };
  }, [screen, patch, width, height, wire, cursor, surface, viewport, output, modules]);

  return (
    <svg
      ref={svg}
      className={`cables${screen ? ' screen-cables' : ''}`}
      width={width}
      height={height}
      aria-label={screen ? 'Master output cables' : 'Patch cables'}
      onClick={(event) => event.stopPropagation()}
    >
      <defs>
        <mask
          id={`${id}-fade`}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width={width}
          height={height}
        >
          <rect width={width} height={height} fill="white" />
          {screen && (
            <rect
              data-header
              width={width}
              fill={hoveredModule === patch.output?.id ? '#242424' : 'white'}
            />
          )}
          <g data-projection>
            {patch.modules
              .filter((m) => m.id === hoveredModule)
              .map((m) => (
                <rect
                  key={m.id}
                  x={m.x - 4}
                  y={m.y - 4}
                  width={DEFINITIONS[m.type].width + 8}
                  height={MODULE_HEIGHT + 8}
                  fill="#242424"
                  rx="7"
                />
              ))}
          </g>
        </mask>
        <clipPath id={`${id}-hits`} clipPathUnits="userSpaceOnUse">
          <path
            data-hits
            fillRule="evenodd"
            clipRule="evenodd"
            d={screen ? undefined : `M0 0H${width}V${height}H0Z ${holes}`}
          />
        </clipPath>
      </defs>
      {cables.map((c) => {
        const a = modules.find((m) => m.id === c.from),
          b = modules.find((m) => m.id === c.to);
        if (!a || !b) return null;
        const start = portPoint(a, c.fromPort, 'out');
        const end = screen ? start : portPoint(b, c.toPort, 'in');
        const path = screen ? undefined : curve(start, end);
        return (
          <g
            key={c.id}
            data-cable={c.id}
            className={`cable ${probe && ((probe.id === c.from && probe.port === c.fromPort && probe.direction === 'out') || (probe.id === c.to && probe.port === c.toPort && probe.direction === 'in')) ? 'inspected' : ''}`}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove(c.id);
            }}
          >
            <title>{`${DEFINITIONS[a.type].name} ${c.fromPort} → ${screen ? 'MASTER' : DEFINITIONS[b.type].name} ${c.toPort}`}</title>
            <path className="cable-hit" d={path} clipPath={`url(#${id}-hits)`} />
            <g className="cable-drawing" mask={`url(#${id}-fade)`}>
              <path className="cable-shadow" d={path} />
              <path d={path} stroke={c.color} strokeWidth="4.5" />
              <path className="cable-highlight" d={path} />
              {[start, end].map((p, i) => (
                <g
                  key={i}
                  data-plug={i}
                  transform={screen ? undefined : `translate(${p.x} ${p.y})`}
                >
                  <circle r="7" fill="#272928" />
                  <circle r="4.3" fill={c.color} />
                </g>
              ))}
            </g>
          </g>
        );
      })}
      {screen && wire && (
        <path
          data-pending
          stroke={wire.color}
          strokeWidth="4"
          opacity=".75"
          strokeDasharray="5 4"
        />
      )}
    </svg>
  );
}
