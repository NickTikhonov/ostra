'use client';
import { useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Footprints,
  Shuffle,
  Dice5,
  RotateCcw,
  LockKeyhole,
  LockKeyholeOpen,
} from 'lucide-react';
import { ModuleKnob, useModule } from '@/components/controls/ModuleControls';
import { Knob } from '@/components/controls/Knob';
import { StepSlider } from '@/components/controls/StepSlider';
import { clamp, ORDERS, resizeData } from './data.js';
import { definition } from './definition.js';
import type { SequenceData } from './data.js';
import styles from './panel.module.css';

const orderIcons = [ArrowRight, Shuffle, ArrowLeft, ArrowLeftRight, Footprints];
const mutationParam = { id: 'mutation', label: 'MUTATE', min: 0, max: 1, default: 0.1 };
function Value({
  label,
  value,
  min,
  max,
  onBegin,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onBegin: () => void;
  onChange: (n: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null),
    dirty = useRef(false);
  return (
    <input
      aria-label={label}
      inputMode="decimal"
      value={draft ?? Number(value.toFixed(3))}
      onFocus={() => {
        onBegin();
        dirty.current = false;
        setDraft(String(value));
      }}
      onChange={(e) => {
        dirty.current = true;
        setDraft(e.target.value);
      }}
      onBlur={() => {
        if (dirty.current && draft !== null && draft.trim() && Number.isFinite(Number(draft)))
          onChange(clamp(Number(draft), min, max));
        dirty.current = false;
        setDraft(null);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          dirty.current = false;
          setDraft(null);
        }
      }}
    />
  );
}
export default function Panel() {
  const { module, display, running, beginEdit, setData, setParam } = useModule();
  const data = module.data as SequenceData;
  const length = Math.round(module.params.length),
    mode = Math.round(module.params.mode);
  const [selection, setSelected] = useState(0);
  const selected = Math.min(selection, data.steps.length - 1);
  const pageStart = Math.floor(selected / 8) * 8;
  const [previous, setPrevious] = useState<number[] | null>(null);
  function change<K extends keyof SequenceData>(key: K, value: SequenceData[K]) {
    setData({ ...data, [key]: value });
  }
  function stage(
    key: 'probabilities' | 'gateLengths' | 'slides' | 'locks',
    value: number | boolean,
  ) {
    setData({
      ...data,
      [key]: data[key].map((v, i) => (i === selected ? value : v)),
      ...(key === 'gateLengths' ? { legacyClockGate: false } : {}),
    });
  }
  function vary(mutate: boolean) {
    beginEdit();
    setPrevious([...data.steps]);
    const span = data.rangeMax - data.rangeMin;
    change(
      'steps',
      data.steps.map((v, i) =>
        data.locks[i] || (mutate && data.mutation === 0)
          ? v
          : mutate
            ? clamp(
                v + (Math.random() * 2 - 1) * span * data.mutation,
                data.rangeMin,
                data.rangeMax,
              )
            : data.rangeMin + Math.random() * span,
      ),
    );
  }
  const OrderIcon = orderIcons[mode],
    LockIcon = data.locks[selected] ? LockKeyhole : LockKeyholeOpen;
  const stageMode = data.skips[selected] ? 2 : data.gates[selected] ? 0 : 1;
  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.range} aria-label="Voltage editing range">
          <Value
            label="Minimum voltage"
            value={data.rangeMin}
            min={-10}
            max={data.rangeMax - 0.01}
            onBegin={beginEdit}
            onChange={(v) => change('rangeMin', v)}
          />
          <span>…</span>
          <Value
            label="Maximum voltage"
            value={data.rangeMax}
            min={data.rangeMin + 0.01}
            max={10}
            onBegin={beginEdit}
            onChange={(v) => change('rangeMax', v)}
          />
          <span>V</span>
        </div>
        <div className={styles.variation}>
          <button onClick={() => vary(true)} aria-label="Mutate unlocked voltages">
            <Shuffle size={11} />
            Mutate
          </button>
          <button onClick={() => vary(false)} aria-label="Randomise unlocked voltages">
            <Dice5 size={11} />
            Random
          </button>
          <button
            aria-label="Undo variation"
            disabled={!previous}
            onClick={() => {
              if (previous) {
                beginEdit();
                change('steps', previous);
                setPrevious(null);
              }
            }}
          >
            <RotateCcw size={11} />
          </button>
        </div>
      </div>
      <div className={styles.steps}>
        {data.steps.slice(pageStart, pageStart + 8).map((value, offset) => {
          const i = pageStart + offset;
          return (
            <StepSlider
              key={i}
              index={i}
              value={value}
              min={data.rangeMin}
              max={data.rangeMax}
              enabled={data.gates[i]}
              active={running && display.step === i}
              selected={selected === i}
              skipped={data.skips[i]}
              locked={data.locks[i]}
              inactive={i >= length}
              onBegin={beginEdit}
              onChange={(v) =>
                change(
                  'steps',
                  data.steps.map((n, k) => (k === i ? v : n)),
                )
              }
              onToggle={() => {
                beginEdit();
                change(
                  'gates',
                  data.gates.map((v, n) => (n === i ? !v : v)),
                );
              }}
              onSelect={() => setSelected(i)}
            />
          );
        })}
      </div>
      <div
        className={styles.stageControls}
        role="group"
        aria-label={`Stage ${selected + 1} controls`}
      >
        <div className={styles.stageLabel}>
          <span>STAGE {selected + 1}</span>
          {data.steps.length > 8 && (
            <div className={styles.pages} aria-label="Sequence pages">
              <button
                aria-label="Previous eight stages"
                disabled={pageStart === 0}
                onClick={() => setSelected(pageStart - 8)}
              >
                <ArrowLeft size={10} />
              </button>
              <span>
                {pageStart + 1}–{pageStart + 8}
              </span>
              <button
                aria-label="Next eight stages"
                disabled={pageStart + 8 >= data.steps.length}
                onClick={() => setSelected(pageStart + 8)}
              >
                <ArrowRight size={10} />
              </button>
            </div>
          )}
        </div>
        <div className={styles.stageFields}>
          <label>
            <span>BEHAVIOUR</span>
            <button
              aria-label={`Stage ${selected + 1} behaviour: ${['Gate', 'Rest', 'Skip'][stageMode]}`}
              onClick={() => {
                beginEdit();
                const next = (stageMode + 1) % 3;
                setData({
                  ...data,
                  skips: data.skips.map((v, i) => (i === selected ? next === 2 : v)),
                  gates: data.gates.map((v, i) => (i === selected ? next === 0 : v)),
                });
              }}
            >
              {['Gate', 'Rest', 'Skip'][stageMode]}
            </button>
          </label>
          <label>
            <span>CHANCE %</span>
            <Value
              key={`chance-${selected}`}
              label={`Stage ${selected + 1} gate chance percent`}
              value={Math.round(data.probabilities[selected] * 100)}
              min={0}
              max={100}
              onBegin={beginEdit}
              onChange={(v) => stage('probabilities', v / 100)}
            />
          </label>
          <label>
            <span>LENGTH %</span>
            <Value
              key={`width-${selected}`}
              label={`Stage ${selected + 1} gate length percent`}
              value={Math.round(data.gateLengths[selected] * 100)}
              min={1}
              max={100}
              onBegin={beginEdit}
              onChange={(v) => stage('gateLengths', v / 100)}
            />
          </label>
          <label>
            <span>GLIDE</span>
            <button
              aria-label={`Stage ${selected + 1} glide`}
              aria-pressed={data.slides[selected]}
              onClick={() => {
                beginEdit();
                stage('slides', !data.slides[selected]);
              }}
            >
              {data.slides[selected] ? 'On' : 'Off'}
            </button>
          </label>
          <label>
            <span>LOCK</span>
            <button
              aria-label={`Stage ${selected + 1} voltage lock`}
              aria-pressed={data.locks[selected]}
              onClick={() => {
                beginEdit();
                stage('locks', !data.locks[selected]);
              }}
            >
              <LockIcon size={12} />
            </button>
          </label>
        </div>
      </div>
      <div className={styles.playback}>
        <ModuleKnob id="tempo" />
        <ModuleKnob id="glide" />
        <Knob
          param={definition.params.find((p) => p.id === 'length')!}
          value={length}
          onBegin={beginEdit}
          onChange={(value) => {
            const next = Math.round(value);
            setData(resizeData(data, next));
            setParam('length', next);
            setPrevious(null);
          }}
        />
        <div className={styles.order}>
          <button
            aria-label={`Playback order: ${ORDERS[mode]}`}
            onClick={() => {
              beginEdit();
              setParam('mode', (mode + 1) % ORDERS.length);
            }}
            onKeyDown={(e) => {
              if (['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown'].includes(e.key)) {
                e.preventDefault();
                beginEdit();
                setParam(
                  'mode',
                  (mode + (['ArrowRight', 'ArrowUp'].includes(e.key) ? 1 : ORDERS.length - 1)) %
                    ORDERS.length,
                );
              }
            }}
          >
            <OrderIcon size={14} />
            <span>{ORDERS[mode]}</span>
          </button>
          <span>ORDER</span>
        </div>
        <ModuleKnob id="chance" />
        <Knob
          param={mutationParam}
          value={data.mutation}
          onBegin={beginEdit}
          onChange={(v) => change('mutation', v)}
        />
      </div>
      <div className={styles.modes}>
        <label>
          <span>STAGE CV</span>
          <button
            aria-label={`Stage addressing: ${data.addressMode ? 'On clock' : 'Continuous'}`}
            onClick={() => {
              beginEdit();
              change('addressMode', data.addressMode ? 0 : 1);
            }}
          >
            {data.addressMode ? 'On clock' : 'Follow'}
          </button>
        </label>
        <label>
          <span>GATE TIME</span>
          <button
            aria-label={`Gate timing: ${data.legacyClockGate ? 'Clock pulse' : 'Stage length'}`}
            onClick={() => {
              beginEdit();
              change('legacyClockGate', !data.legacyClockGate);
            }}
          >
            {data.legacyClockGate ? 'Clock' : 'Stage'}
          </button>
        </label>
      </div>
    </>
  );
}
