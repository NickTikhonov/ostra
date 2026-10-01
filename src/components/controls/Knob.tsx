'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Param } from '@/modules/types';
export function formatValue(p: Param, v: number) {
  if (p.unit === 'Hz')
    return v >= 1000
      ? `${(v / 1000).toFixed(2)} kHz`
      : `${v < 10 ? v.toFixed(2) : Math.round(v)} Hz`;
  if (p.unit === 's') return v < 1 ? `${Math.round(v * 1000)} ms` : `${v.toFixed(2)} s`;
  if (p.unit === 'st' || p.unit === 'ct') return `${v > 0 ? '+' : ''}${Math.round(v)} ${p.unit}`;
  if (p.unit === 'oct') return `${v > 0 ? '+' : ''}${v.toFixed(1)} oct`;
  if (p.unit === 'V') return `${v.toFixed(2)} V`;
  if (p.unit === 'x') return `${v.toFixed(2)}×`;
  if (p.unit === 'steps') return `${Math.round(v)} steps`;
  if (p.id === 'drive') return `${v.toFixed(1)}×`;
  if (p.unit === 'BPM') return `${Math.round(v)} BPM`;
  return `${Math.round(v * 100)}%`;
}
export function Knob({
  param,
  value,
  onChange,
  onBegin,
  large = false,
}: {
  param: Param;
  value: number;
  onChange: (n: number) => void;
  onBegin: () => void;
  large?: boolean;
}) {
  const drag = useRef<{ y: number; value: number } | null>(null);
  const control = useRef<HTMLDivElement>(null),
    hovered = useRef(false);
  const [readout, setReadout] = useState<{ x: number; y: number } | null>(null);
  const visible = readout !== null;
  function positionReadout() {
    const rect = control.current?.getBoundingClientRect();
    if (!rect) return;
    if (
      rect.bottom <= 0 ||
      rect.top >= window.innerHeight ||
      rect.right <= 0 ||
      rect.left >= window.innerWidth
    ) {
      setReadout(null);
      return;
    }
    const margin = Math.min(88, window.innerWidth / 2);
    setReadout({
      x: Math.max(margin, Math.min(window.innerWidth - margin, rect.left + rect.width / 2)),
      y: Math.max(
        8,
        Math.min(
          window.innerHeight - 32,
          rect.bottom + 30 > window.innerHeight ? rect.top - 30 : rect.bottom + 7,
        ),
      ),
    });
  }
  function finishDrag() {
    drag.current = null;
    if (!hovered.current && !control.current?.contains(document.activeElement)) setReadout(null);
  }
  useEffect(() => {
    if (!visible) return;
    window.addEventListener('resize', positionReadout);
    window.addEventListener('scroll', positionReadout, true);
    return () => {
      window.removeEventListener('resize', positionReadout);
      window.removeEventListener('scroll', positionReadout, true);
    };
  }, [visible]);
  const norm = param.log
    ? Math.log(value / param.min) / Math.log(param.max / param.min)
    : (value - param.min) / (param.max - param.min);
  const fromNorm = (n: number) => {
    let v = param.log
      ? param.min * Math.pow(param.max / param.min, n)
      : param.min + n * (param.max - param.min);
    if (param.step) v = Math.round(v / param.step) * param.step;
    return Math.min(param.max, Math.max(param.min, v));
  };
  return (
    <div
      ref={control}
      className={`knob-control ${large ? 'large' : ''}`}
      onMouseEnter={() => {
        hovered.current = true;
        positionReadout();
      }}
      onMouseLeave={() => {
        hovered.current = false;
        if (!drag.current && !control.current?.contains(document.activeElement)) setReadout(null);
      }}
      onFocusCapture={positionReadout}
      onBlurCapture={() => {
        if (!hovered.current && !drag.current) setReadout(null);
      }}
    >
      <div className="knob-track">
        <div className="knob-ticks" />
        <button
          className="knob"
          role="slider"
          aria-label={param.label}
          aria-valuemin={param.min}
          aria-valuemax={param.max}
          aria-valuenow={value}
          aria-valuetext={formatValue(param, value)}
          aria-description="Drag up/down. Shift for fine adjustment. Double-click to reset."
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            onBegin();
            drag.current = { y: e.clientY, value: norm };
            positionReadout();
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (e.buttons === 0) {
              drag.current = null;
              return;
            }
            if (drag.current)
              onChange(
                fromNorm(
                  Math.min(
                    1,
                    Math.max(
                      0,
                      drag.current.value + (drag.current.y - e.clientY) / (e.shiftKey ? 1400 : 180),
                    ),
                  ),
                ),
              );
          }}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onLostPointerCapture={finishDrag}
          onDoubleClick={() => {
            onBegin();
            onChange(param.default);
          }}
          onKeyDown={(e) => {
            if (
              ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'Home', 'End'].includes(e.key)
            ) {
              e.preventDefault();
              onBegin();
              onChange(
                fromNorm(
                  e.key === 'Home'
                    ? 0
                    : e.key === 'End'
                      ? 1
                      : norm +
                        (['ArrowUp', 'ArrowRight'].includes(e.key) ? 1 : -1) *
                          (param.step && !param.log
                            ? param.step / (param.max - param.min)
                            : e.shiftKey
                              ? 0.001
                              : 0.01),
                ),
              );
            }
          }}
        >
          <span style={{ transform: `rotate(${-135 + norm * 270}deg)` }} />
        </button>
      </div>
      <span className="knob-label">{param.label}</span>
      {readout &&
        createPortal(
          <span
            className="knob-tooltip"
            aria-hidden="true"
            style={{ left: readout.x, top: readout.y }}
          >
            {formatValue(param, value)}
          </span>,
          document.body,
        )}
    </div>
  );
}
