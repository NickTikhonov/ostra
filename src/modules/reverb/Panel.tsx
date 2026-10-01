'use client';
import { Dial } from '@/components/controls/Studio';
import { PanelArtwork } from '@/components/controls/PanelArtwork';
import { ModuleSwitch, useModule } from '@/components/controls/ModuleControls';
import styles from './panel.module.css';
export default function Panel() {
  const { running, display } = useModule();
  return (
    <>
      <PanelArtwork>
        <path
          className="wash"
          d="M68 102A 40  40 0 1 1 148 102V125H68ZM191 102A40 40 0 1 1 271 102V125H191Z"
        />
        <path d="M72 102A36 36 0 1 1 144 102M80 102A28 28 0 1 1 136 102M195 102A36 36 0 1 1 267 102M203 102A28 28 0 1 1 259 102" />
        <path d="M49 80H 60M49 151H60V119M173 62V146M271 172H239V152M112 293H175M224 270H251V334H267M251 272H267" />
        <rect className="wash" x="17" y="185" width="237" height="81" rx="10" />
      </PanelArtwork>
      <Dial id="size" x={108} y={105} large />
      <Dial id="decay" x={231} y={105} large />
      <Dial id="predelay" x={60} y={216} />
      <Dial id="tone" x={143} y={216} />
      <Dial id="width" x={222} y={216} />
      <Dial id="mix" x={188} y={315} />
      <div className={styles.freeze}>
        <ModuleSwitch
          id="freeze"
          label="FREEZE"
          ariaLabel="Freeze reverb tail"
          className={styles.freezeButton}
        />
      </div>
      <span
        className={styles.holdLight}
        data-active={running && display.frozen === true}
        aria-label={
          !running
            ? 'Audio stopped'
            : display.frozen === true
              ? 'Reverb tail frozen'
              : 'Reverb tail live'
        }
      />
    </>
  );
}
