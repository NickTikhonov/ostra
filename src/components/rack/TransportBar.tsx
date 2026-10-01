'use client';
import { Circle, Pause, Play, Square, Volume2, VolumeX } from 'lucide-react';
import type { ReactNode, Ref } from 'react';
import { Knob } from '../controls/Knob';
import { DEFINITIONS, type RackModule, type Port } from '@/lib/modules';
import styles from './TransportBar.module.css';

export function TransportBar({
  running,
  busy,
  recording,
  seconds,
  saved,
  output,
  outputRef,
  onPlay,
  onStop,
  onRecord,
  onBegin,
  onLevel,
  onMute,
  onHover,
  renderPort,
}: {
  running: boolean;
  busy: boolean;
  recording: boolean;
  seconds: number;
  saved: boolean;
  output: RackModule;
  outputRef: Ref<HTMLDivElement>;
  onPlay: () => void;
  onStop: () => void;
  onRecord: () => void;
  onBegin: () => void;
  onLevel: (value: number) => void;
  onMute: () => void;
  onHover: (hovered: boolean) => void;
  renderPort: (port: Port) => ReactNode;
}) {
  const minutes = Math.floor(seconds / 60),
    remainder = Math.floor(seconds % 60);
  return (
    <header
      className={styles.bar}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
    >
      <div className={styles.brand}>
        ostra<span>MODULAR</span>
      </div>
      <div className={styles.transport} role="group" aria-label="Transport">
        <button
          className={`${styles.key} ${running ? styles.engaged : ''}`}
          aria-label={running ? 'Pause audio' : 'Start audio'}
          aria-pressed={running}
          disabled={busy}
          onClick={onPlay}
        >
          {running ? (
            <Pause size={18} fill="currentColor" />
          ) : (
            <Play size={18} fill="currentColor" />
          )}
          <span>{running ? 'PAUSE' : 'PLAY'}</span>
        </button>
        <button
          className={styles.key}
          aria-label="Stop and rewind"
          disabled={busy}
          onClick={onStop}
        >
          <Square size={16} fill="currentColor" />
          <span>STOP</span>
        </button>
        <button
          className={`${styles.key} ${styles.record} ${recording ? styles.recording : ''}`}
          aria-label={recording ? 'Finish recording and download WAV' : 'Record WAV'}
          aria-pressed={recording}
          disabled={busy}
          onClick={onRecord}
        >
          <Circle size={17} fill="currentColor" />
          <span>{recording ? 'FINISH' : 'REC'}</span>
        </button>
      </div>
      <div
        className={styles.display}
        aria-label={`Recording time ${minutes} minutes ${remainder} seconds`}
      >
        <span className={recording ? styles.live : ''}>{recording ? '● REC' : 'WAV / STEREO'}</span>
        <strong>
          {String(minutes).padStart(2, '0')}:{String(remainder).padStart(2, '0')}
        </strong>
      </div>
      <span
        className={`${styles.saved} save-light ${saved ? 'saved' : ''}`}
        role="status"
        aria-label={saved ? 'Saved on this device' : 'Unsaved changes'}
      />
      <div className={styles.output} ref={outputRef} aria-label="Master output">
        <div className={styles.sockets}>{DEFINITIONS.output.inputs.map(renderPort)}</div>
        <Knob
          param={DEFINITIONS.output.params[0]}
          value={output.params.level}
          onChange={onLevel}
          onBegin={onBegin}
        />
        <button
          className={styles.mute}
          aria-label={output.params.mute ? 'Unmute master output' : 'Mute master output'}
          aria-pressed={!!output.params.mute}
          onClick={onMute}
        >
          {output.params.mute ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
    </header>
  );
}
