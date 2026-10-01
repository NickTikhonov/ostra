# Contributing a module

A module is one folder. React draws its controls; an independent processor turns patched input voltages into output voltages. The rack owns placement, cables, undo, and saving.

```text
Panel → shared controls → params/data → audio processor → output ports
                                     ↑ input ports
```

## Folder contract

Copy an existing folder in `src/modules/` and give it a unique lowercase name, such as `attenuator`. Match `definition.type` to that folder name. Keep the four required files; add scoped CSS when the panel needs it:

| File                          | Responsibility                                                                           |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `definition.js`               | Stable type/version, name, appearance, ports, parameters, and optional saved-data hooks. |
| `Panel.tsx`                   | One React component, default export.                                                     |
| `processor.js`                | Default-exported processor with `createState()` and `process(context)`.                  |
| `panel.module.css` (optional) | Scoped styles with a `.panel` root class.                                                |
| `index.ts`                    | Exports the definition, panel component, and optional CSS class together.                |

The dev watcher discovers complete folders automatically. `npm run modules:sync` also generates registries and browser worklet files without starting audio. No edits to the rack or engine are needed. Folders beginning with `_` are ignored. Do not edit `*.generated.*` or `public/runtime/` directly.

## Small example: an attenuator

`definition.js` is plain JavaScript so both React and the browser worklet can import it. JSDoc connects it to the TypeScript contract.

```js
// @ts-check
/** @type {import('../types').ModuleDefinition} */
export const definition = {
  type: 'attenuator',
  version: 1,
  name: 'ATT',
  subtitle: 'ATTENUATOR',
  mark: '↘',
  color: '#35584c',
  panel: '#aacfb7',
  width: 168,
  layout: 'studio',
  headerLayout: 'compact',
  portStyle: 'badge',
  inputs: [{ id: 'in', label: 'IN', kind: 'audio', x: 32, y: 90, labelPosition: 'below' }],
  outputs: [{ id: 'out', label: 'OUT', kind: 'audio', x: 132, y: 300, labelPosition: 'below' }],
  params: [{ id: 'level', label: 'LEVEL', min: 0, max: 1, default: 0.5 }],
};
```

`Panel.tsx` declares the layout. The bound control reads its range, label, and value from the definition and handles editing and undo.

```tsx
import { Dial } from '@/components/controls/Studio';

export default function AttenuatorPanel() {
  return <Dial id="level" x={84} y={180} large />;
}
```

`processor.js` receives a sample's inputs and writes the outputs. It runs for every audio sample, independently of React rendering.

```js
// @ts-check
/** @satisfies {import('../types').ModuleProcessor<Record<string, never>>} */
const processor = {
  createState: () => ({}),
  process({ inputs, outputs, params }) {
    outputs.out = inputs.in * params.level;
  },
};
export default processor;
```

An optional `panel.module.css` scopes styles beneath the module's host section:

```css
.panel :global(.studio-dial.hero) :global(.knob) {
  box-shadow: 0 4px 8px #233c3544;
}
```

`index.ts` connects the UI pieces. Omit the CSS import and `className` when shared styling is sufficient:

```ts
import type { ModulePlugin } from '../types';
import { definition } from './definition.js';
import Panel from './Panel';
import styles from './panel.module.css';

export default { definition, Panel, className: styles.panel } satisfies ModulePlugin;
```

## Shared UI and saved state

- `Studio.tsx` provides positioned `Dial`, `Choice`, `Readout`, and `Action` primitives for the current FIELD family. Use `layout: 'studio'`, original `name`/`subtitle`, `panel`/`color`, and optional `category`/`order` for the add menu. See the VCA folder for a small current example.
- `PanelArtwork.tsx` supplies a non-interactive SVG canvas and printed `Legend`. Every panel supplies its own shapes, grouping and signal-flow paths. Artwork never changes the electrical routing.
- `ModuleKnob` binds a numeric parameter by ID. Ranges can be logarithmic; knobs support dragging, fine adjustment, keyboard input, and reset.
- `ModuleSwitch` binds a 0/1 parameter. Set `smooth: false` in its definition to make switching immediate.
- `StepSlider` is the reusable voltage slider, editable readout, gate and stage-selection control used by PATH. Its configurable range supports continuous values and fine keyboard adjustment.
- `useModule()` exposes `module`, `definition`, `running`, `display`, `beginEdit`, `setParam`, `setData`, and `trigger` for custom interfaces. Call `beginEdit()` once at the start of a custom gesture, then update values immutably.
- The shared host supplies the frame, title, jacks, drag behavior, and remove action. Ports are generated from the definition.

Scalar controls go in `params`; other saved settings go in JSON-compatible `data`. For custom data, implement **both** `createData()` and `restoreData(savedInstance)`. The latter validates saved values, fills missing fields, and migrates older versions. Without those hooks the module uses empty data. The sequencer is the working example, including migration from the earlier top-level `steps` and `gates` fields.

Keep type, parameter, and port IDs stable so existing patches keep their settings and wiring. Increment `version` when the saved schema changes. The current restore hook migrates custom data; parameter or port renames need an explicit patch migration in the host. Saving includes positions, cables, parameters, custom data, and zoom; transient processor state is intentionally not saved.

Every port requires explicit `x`/`y` socket-centre coordinates on the 380px-tall panel. There are no reserved jack rows, default socket positions or shared patch-bay background. Put CV beside its control, repeat mixer channels horizontally or vertically, or spread waveform outputs down an edge. Shared materials live in `src/app/studio.css`; use optional local CSS for module-specific styling. Archived modules can remain registered with `hidden: true` to preserve saved racks without appearing in the add menu.

Placement belongs to `src/lib/placement.ts`, including repairing saved overlaps after panel widths change. Cable layering and local hover fading belong to the rack, not individual panels. Every registered port automatically supports the voltage inspector: no module-specific analyser or display callback is needed.

## Audio contract

`createState(sampleRate, id)` creates independent state for each instance. `process(context)` receives that state plus `sampleRate`, `params`, `data`, `inputs`, `connected`, `outputConnected`, `outputs`, and `stereo`. Write every output on each sample. `connected[portId]` distinguishes an unpatched input from a patched zero voltage.

Use ±5V nominal audio, 1V/oct pitch (0V is C4), and 0–5V gates/envelopes. All ports carry sample-rate voltages. The host smooths parameters by default, resolves graph order, and delays feedback edges by one sample. It preserves processor state through ordinary patch edits. Only a processor with `audioOutput: true` sends its `stereo.left/right` values to the master output; see the output module for scaling.

Keep the sample loop short and allocation-free. Processors cannot use React, DOM APIs, timers, or asynchronous work. Shared DSP helpers live in `src/audio/dsp.js`; module-specific JavaScript helpers can stay alongside the processor. JavaScript sources are copied with their relative paths intact. Optional `getDisplayState(state)` returns a small numeric/boolean record at UI rate, as used for the sequencer's active step.

Panel edits use normal React hot reload. After changing processor code, refresh the page to load the new worklet; playback starts paused. This is a trusted source-code extension system, not an in-app loader for arbitrary generated code.

`src/audio/scope.js` captures a selected output (patched or unpatched) or connected input's actual voltage in the engine's sample loop. It maintains a four-second min/max history and sends display frames through the worklet at UI rate. Capture and display are transient and never enter saved module data. `src/lib/scope.ts` defines the message contract, and `JackScope.tsx` draws the compact history. Selecting a jack must never create or resume an AudioContext, or change `outputConnected`: probing must not alter normalled routing.

`src/lib/patching.ts` handles starting and completing cable edits. A pending reconnection keeps the opposite endpoint fixed and preserves cable ID/colour on completion. The committed patch changes once, when a compatible jack is selected; cancelling cannot alter audio routing or saved cables. The rack distinguishes the initial pointer-up from a subsequent drop and suppresses the browser's trailing click after a successful drag.

## Legacy faceplates and events

Set `definition.layout` to `'faceplate'` and add `x`/`y` coordinates to port definitions for free jack placement. Coordinates are local pixels on the 380px-tall panel. The cable host uses the same positions. Coordinates are required for both new and archived modules; the host does not infer a layout.

`PanelKnob`, `PanelToggle`, `PanelLed`, `PanelText`, and `PanelButton` in `components/controls/Faceplate.tsx` provide positioned shared controls. Panels keep their graphics and CSS in their own folder. `reference` records the source hardware; `hidden` keeps an older definition loadable without offering it in the add menu.

A processor may implement `onEvent(context, event)` for momentary operations. `trigger(event)` from the panel sends that event to the worklet; the A-155's manual buttons demonstrate it. Events are transient and are not saved as settings. The transport must be running to send them.

`outputConnected[portId]` tells a processor whether an output is patched. Maths uses this to disconnect individual channels from its sum buses. Input connection flags remain in `connected`; the two maps are separate even when input and output IDs match.

### Flexible faceplates

Module definitions can set `headerLayout: 'compact'` for an inline title/subtitle and `portStyle: 'badge'` for dark output markings. This is a visual treatment, not a layout: the host draws no patch bay. Each port chooses its `x`/`y` and optional `labelPosition: 'above' | 'below'`. The panel supplies controls and artwork independently. ORBIT has side columns of sockets, BRAID repeats horizontal mixing channels, and SPOOL groups time/feedback separately from tape character and mix. Stable port IDs connect this UI geometry to the processor. All sockets retain the shared patch gestures and delayed voltage inspector. Keep customisation controls inside the module; do not introduce external editors or menus.

## Validation and failure handling

`npm run typecheck` includes `tsconfig.audio.json`, which checks all module JavaScript and the AudioWorklet runtime. New processors must annotate their state and satisfy `ModuleProcessor<State>`; the example above is checked as well as documented. Run `npm test` for silent regressions and `npm run build` for the static export. The contribution workflow and CI are described in [CONTRIBUTING.md](../CONTRIBUTING.md).

Uncaught initialization, event, processing or telemetry failures stop transport and report the error. Playback restarts only on a user gesture, with a fresh engine. This is recoverability for trusted source contributions, not execution isolation: infinite loops still require a different runtime boundary.
