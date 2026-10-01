'use client';
import { useEffect, useRef, useState } from 'react';
import { Dial, Choice, Action, Light } from '@/components/controls/Studio';
import { PanelArtwork } from '@/components/controls/PanelArtwork';
import { useModule } from '@/components/controls/ModuleControls';
import { getSample, importSample, releaseImportedSample } from '@/lib/sample-assets';
import styles from './panel.module.css';
export default function Panel() {
  const { module, beginEdit, setData, running, display } = useModule();
  const fileInput = useRef<HTMLInputElement>(null),
    generation = useRef(0),
    mounted = useRef(true);
  const [busy, setBusy] = useState(false),
    [dragging, setDragging] = useState(false),
    [status, setStatus] = useState('');
  const assetId = String(module.data.assetId || ''),
    peaks = (module.data.peaks as number[]) || [];
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current++;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    setStatus(assetId ? 'Loading saved sample…' : 'Drop WAV / MP3 · or click to browse');
    if (assetId)
      void getSample(assetId)
        .then((sample) => {
          if (!cancelled)
            setStatus(
              sample
                ? `${sample.duration.toFixed(1)} s · saved on this device`
                : 'File missing · drop it here to restore',
            );
        })
        .catch((error) => {
          if (!cancelled) setStatus(error.message);
        });
    return () => {
      cancelled = true;
    };
  }, [assetId]);
  async function load(file: File) {
    const request = ++generation.current;
    let importedId = '';
    setBusy(true);
    setStatus('Decoding and saving locally…');
    try {
      const sample = await importSample(file);
      importedId = sample.id;
      if (!mounted.current || request !== generation.current) return;
      beginEdit();
      setData({
        assetId: sample.id,
        name: sample.name,
        duration: sample.duration,
        peaks: sample.peaks,
      });
      setStatus(`${sample.duration.toFixed(1)} s · saved on this device`);
    } catch (error) {
      if (mounted.current && request === generation.current)
        setStatus(error instanceof Error ? error.message : 'Import failed.');
    } finally {
      if (importedId) releaseImportedSample(importedId);
      if (mounted.current && request === generation.current) setBusy(false);
    }
  }
  return (
    <>
      <PanelArtwork>
        <rect className="wash" x="89" y="127" width="371" height="181" rx="16" />
        <path d="M88 220H461M476 131V298M62 270H80" />
      </PanelArtwork>
      <button
        className={styles.drop}
        data-dragging={dragging}
        aria-label="Load WAV or MP3 sample"
        aria-busy={busy}
        onClick={() => {
          if (!busy) fileInput.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'copy';
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) void load(file);
        }}
      >
        <span className={styles.file}>{String(module.data.name || 'DROP A SOUND')}</span>
        <span className={styles.status} role="status">
          {status}
        </span>
        {peaks.length > 0 && (
          <svg viewBox="0 0 192 36" aria-hidden="true">
            {peaks.map((v, n) => (
              <path key={n} d={`M${n * 2} ${18 - v * 16}V${18 + v * 16}`} />
            ))}
            <line
              className={styles.playhead}
              x1={(running ? Number(display.position ?? 0) : module.params.position) * 192}
              x2={(running ? Number(display.position ?? 0) : module.params.position) * 192}
              y1="0"
              y2="36"
            />
          </svg>
        )}
      </button>
      <input
        ref={fileInput}
        className={styles.fileInput}
        type="file"
        accept=".wav,.mp3,audio/wav,audio/mpeg"
        aria-label="Sample file"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = '';
          if (file) void load(file);
        }}
      />
      <Dial id="position" x={145} y={166} />
      <Dial id="length" x={270} y={166} />
      <Dial id="tune" x={395} y={166} />
      <Dial id="grain" x={145} y={267} />
      <Dial id="density" x={270} y={267} />
      <Dial id="spray" x={395} y={267} />
      <Choice id="mode" options={['ONE-SHOT', 'LOOP', 'GRANULAR']} x={145} y={339} />
      <Choice id="reverse" options={['FORWARD', 'REVERSE']} x={300} y={339} />
      <Action event="trigger" label="TRIGGER" x={428} y={344} />
      <Light on={running && display.playing === true} x={473} y={345} />
    </>
  );
}
