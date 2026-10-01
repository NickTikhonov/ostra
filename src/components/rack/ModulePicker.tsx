'use client';
import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { DEFINITIONS, type ModuleType } from '@/lib/modules';
import styles from './ModulePicker.module.css';

const aliases: Partial<Record<ModuleType, string>> = {
  vca: 'amplifier gain',
  sequencer: 'cv voltage stage step sequencing modulation random glide',
  lfo: 'low frequency oscillator modulation',
  envelope: 'adsr envelope generator',
  quantiser: 'quantizer scale pitch',
  'cv-mixer': 'attenuator attenuverter attenuation invert offset mixer',
  distortion: 'fuzz saturation drive wavefolder',
  'tape-delay': 'analog analogue lofi lo fi echo tape',
  reverb: 'stereo space room hall freeze',
  random: 'noise sample hold smooth random generative',
  switch: 'voltage controlled sequential router mux demux',
  'shift-register': 'analog analogue shift register asr cv delay steps memory',
  logic: 'boolean and or xor not comparator threshold',
  maths: 'slew function generator rise fall cycling envelope maths',
  'stereo-mixer': 'pan balance audio mixer effects send return',
  sampler: 'sample granular grains wav mp3 file loop playback',
};
const normalise = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const catalogue = Object.entries(DEFINITIONS)
  .filter(([, definition]) => !definition.hidden)
  .sort(([, a], [, b]) => (a.order ?? 99) - (b.order ?? 99))
  .map(([type, definition]) => ({
    type: type as ModuleType,
    definition,
    search: normalise(
      `${type} ${definition.name} ${definition.subtitle} ${definition.category ?? ''} ${aliases[type as ModuleType] ?? ''}`,
    ),
  }));

export function ModulePicker({
  x,
  y,
  onSelect,
  onClose,
}: {
  x: number;
  y: number;
  onSelect: (type: ModuleType) => void;
  onClose: () => void;
}) {
  const id = useId(),
    input = useRef<HTMLInputElement>(null),
    list = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(''),
    [active, setActive] = useState(0);
  const [bounds, setBounds] = useState({ left: 0, top: 0, width: 244, height: 292 });
  const [scrollHint, setScrollHint] = useState({ overflow: false, atTop: true });
  const measureScroll = useCallback(() => {
    const container = list.current;
    if (!container) return;
    const overflow = container.scrollHeight > container.clientHeight + 1;
    const atTop = container.scrollTop <= 1;
    setScrollHint((previous) =>
      previous.overflow === overflow && previous.atTop === atTop ? previous : { overflow, atTop },
    );
  }, []);
  const terms = normalise(query).split(' ').filter(Boolean);
  const results = catalogue.filter((item) => terms.every((term) => item.search.includes(term)));
  const selected = Math.min(active, results.length - 1);

  useLayoutEffect(() => {
    const previous = document.activeElement;
    const visual = window.visualViewport;
    const resize = () =>
      setBounds({
        left: visual?.offsetLeft ?? 0,
        top: visual?.offsetTop ?? 0,
        width: visual?.width ?? window.innerWidth,
        height: visual?.height ?? window.innerHeight,
      });
    resize();
    input.current?.focus({ preventScroll: true });
    window.addEventListener('resize', resize);
    visual?.addEventListener('resize', resize);
    visual?.addEventListener('scroll', resize);
    return () => {
      window.removeEventListener('resize', resize);
      visual?.removeEventListener('resize', resize);
      visual?.removeEventListener('scroll', resize);
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus({ preventScroll: true });
    };
  }, []);
  useLayoutEffect(() => {
    const container = list.current,
      option = container?.children[selected] as HTMLElement | undefined;
    if (!container || !option) return;
    // Scroll only the results, never the rack beneath the picker.
    const top = option.offsetTop - container.offsetTop;
    if (top < container.scrollTop) container.scrollTop = top;
    else if (top + option.offsetHeight > container.scrollTop + container.clientHeight)
      container.scrollTop = top + option.offsetHeight - container.clientHeight;
  }, [selected, query]);
  useLayoutEffect(() => {
    measureScroll();
    const observer = new ResizeObserver(measureScroll);
    if (list.current) observer.observe(list.current);
    return () => observer.disconnect();
  }, [measureScroll, results.length, bounds.height]);

  const width = Math.min(244, Math.max(0, bounds.width - 16));
  // Reserve the unfiltered height so the search field does not jump while typing.
  const height = Math.min(74 + Math.min(7, catalogue.length) * 32, Math.max(0, bounds.height - 16));
  const left = Math.max(bounds.left + 8, Math.min(x, bounds.left + bounds.width - width - 8));
  const preferredTop = y + height <= bounds.top + bounds.height - 8 ? y : y - height;
  const top = Math.max(
    bounds.top + 8,
    Math.min(preferredTop, bounds.top + bounds.height - height - 8),
  );

  return (
    <>
      <div
        className="menu-dismiss"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        className={styles.picker}
        role="dialog"
        aria-label="Add module"
        style={{ left, top, width, maxHeight: height }}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.nativeEvent.isComposing) return;
          if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          } else if (e.target === input.current && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            if (results.length)
              setActive(
                (selected + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length,
              );
          } else if (e.target === input.current && e.key === 'Enter') {
            e.preventDefault();
            if (results[selected]) onSelect(results[selected].type);
          } else if (e.key === 'Tab') onClose();
        }}
      >
        <div className={styles.search}>
          <Search size={13} aria-hidden="true" />
          <input
            ref={input}
            value={query}
            placeholder="Find a module…"
            aria-label="Find a module"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls={`${id}-results`}
            aria-activedescendant={selected >= 0 ? `${id}-${results[selected].type}` : undefined}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              if (list.current) list.current.scrollTop = 0;
            }}
          />
          {query && (
            <button
              className={styles.clear}
              tabIndex={-1}
              aria-label="Clear search"
              onClick={() => {
                setQuery('');
                setActive(0);
                if (list.current) list.current.scrollTop = 0;
                input.current?.focus({ preventScroll: true });
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>
        <div
          className={styles.results}
          ref={list}
          id={`${id}-results`}
          role="listbox"
          aria-label="Modules"
          onScroll={measureScroll}
        >
          {results.map(({ type, definition: d }, index) => (
            <button
              key={type}
              id={`${id}-${type}`}
              className={styles.option}
              role="option"
              aria-selected={index === selected}
              tabIndex={-1}
              onPointerMove={() => setActive(index)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect(type)}
            >
              <i style={{ background: d.panel }} aria-hidden="true" />
              <strong>{d.category ?? d.subtitle}</strong>
              <span>{d.name}</span>
            </button>
          ))}
        </div>
        {scrollHint.overflow && (
          <div className={styles.scrollHint} data-visible={scrollHint.atTop} aria-hidden="true">
            <span>Scroll for more</span>
            <ChevronDown size={13} />
          </div>
        )}
        {!results.length && (
          <div className={styles.empty} role="status">
            No modules found
          </div>
        )}
      </div>
    </>
  );
}
