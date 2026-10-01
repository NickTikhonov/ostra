# Using ostra

A local-first, canvas-only modular synth. Next.js + React; sound runs in an AudioWorklet. No accounts, server audio, external fonts, or network services.

## Run

Use Node.js 22 or newer (`nvm use` reads `.nvmrc`). This is an experimental alpha.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. Press Play in the top transport bar to enable audio.

- Click empty rack space to add a module. `A` also opens the compact picker. Type a name or function to filter, use ↑/↓ and Enter to add, or scroll the list. Escape dismisses it. The picker stays inside the visible viewport, including when opened near the bottom.
- Use the small trash button at the top of a module to remove it. Right-clicking its panel does not delete it. Undo with the removal notice or `Cmd/Ctrl+Z`; redo with `Cmd/Ctrl+Shift+Z`.
- Drag module headings to rearrange. Modules snap into the nearest available side gap, searching both directions before changing rows.
- Drag between an output and input jack, or click the two jacks in turn. Click/drag a connected jack to move that cable endpoint; Escape cancels. A connected output picks up its newest cable; Shift-click starts an additional connection. Right-click a jack or cable to disconnect.
- Cables sit in front of the panels; segments covering the module under your pointer fade so its controls stay accessible.
- Hover or focus any output, including unpatched outputs, or a connected input for 600 ms to reveal a compact 4-second voltage history. Leaving the jack hides it immediately; moving to another jack restarts the delay. The same trace supports audio and CV. Hovering never starts playback or changes the wiring.
- Drag knobs vertically; Shift gives fine adjustment. Double-click resets. Arrow keys also adjust knobs.
- The initial patch is loaded only when no saved v2 rack exists. Edits, cables, positions, steps, gates, and zoom automatically save in localStorage. An intentionally empty rack remains empty. Audio always starts paused after refresh.
- Storage is specific to the browser and origin. `localhost` and `127.0.0.1` have different saves, as does a deployed URL. The original v1 prototype save is left untouched. Corrupt v2 data is retained under a recovery key before the default rack is restored.

## FIELD modules

Twenty-two original coloured panels share knobs, switches and jack behaviour. Each instrument owns its layout and printed signal flow; there is no standard patch bay. Each module has its own React component and audio processor.

| Function                  | Module   | Main controls                                                                                          |
| ------------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| VCA                       | VEIL     | Bias, CV depth, linear/exponential response                                                            |
| Envelope                  | BLOOM    | Attack, decay, sustain, release                                                                        |
| LFO                       | DRIFT    | Rate, depth, bipolar/unipolar                                                                          |
| Function generator        | VECTOR   | Dual rise/fall envelopes, slew, cycling, attenuverters and sum/OR buses                                |
| CV mixer                  | BRAID    | Three A/B attenuverting pairs, offsets, two cascade links                                              |
| Voltage sequencer         | PATH     | Eight voltage stages, variable range/length/order, glide, CV addressing, per-stage gates and variation |
| VCO                       | ORBIT    | Tune, fine, FM, pulse width; four waveforms                                                            |
| VCF                       | SIEVE    | Cutoff, resonance, CV depth; low/band/high outputs                                                     |
| Delay                     | ECHO     | Time, feedback, tone, mix, clock division                                                              |
| Tape delay                | SPOOL    | Time, regeneration, drive, tone, wear, wow/flutter, hiss, mix                                          |
| Distortion                | GRIT     | Drive, dirt, mix, tone; fuzz/razor/fold modes                                                          |
| Reverb                    | HALO     | Stereo size, decay, pre-delay, tone, width, mix and freeze                                             |
| Random / sample & hold    | CHANCE   | Stepped/smoothed random CV, noise, sampling, hold and probability                                      |
| Voltage-controlled switch | JUNCTION | Four-way routing, CV address, clock advance and reset                                                  |
| CV delay                  | RELAY    | Clocked sample memory with simultaneous one-to-four-step taps                                          |
| Logic / comparator        | LOGIC    | AND, OR, XOR, NOT and threshold comparison with hysteresis                                             |
| Stereo mixer              | HARBOUR  | Three channels, pan/balance, sends, stereo return and master                                           |
| Sampler                   | GRAIN    | Local WAV/MP3, one-shot, loop and granular modes, pitch and position CV                                |
| Output                    | HOME     | Level and mute; stereo inputs                                                                          |
| Clock                     | TICK     | BPM, swing, rate, manual reset                                                                         |
| Divider                   | SPLIT    | /2, /3, /4, /8; trigger/gate, offset                                                                   |
| Quantiser                 | PRISM    | Four channels, shared editable scale buttons, root, octave and per-channel triggers                    |

See [the module guide](studio-modules.md) for patching and signal behaviour. The first-visit rack connects the original twelve FIELD modules into a sequenced voice; All twenty-two catalogue modules can be added from the canvas menu; eight archived types remain loadable. Existing saves keep their modules, settings, and wiring; older module types remain registered with refreshed styling but are hidden from the add menu. Overlapping saved positions are repaired to accommodate wider panels.

These are original digital instruments, not circuit-accurate hardware emulations. Automated DSP and persistence tests, strict UI/DSP typechecks and a production build are included. They do not replace browser compatibility, listening or sustained performance checks.

## Samples and recovery

Drop a WAV or MP3 onto GRAIN, or click its file area to browse. Decoding happens locally without starting audio. Files are limited to 25 MB and two minutes; decoded samples live in IndexedDB, while the rack stores their IDs and waveform previews. No backend receives the audio.

A missing file leaves its sampler empty and displays an error; other voices can still run. Drop the file onto that sampler again to restore it. Unused assets are cleaned up while preserving the current rack, undo/redo, saved/recovery racks and in-progress imports. Cleanup pauses while another rack tab is open; without Web Locks it is disabled conservatively. Corrupt saved/recovery data also prevents cleanup. Browser storage is not a portable backup.

A processor exception stops and disconnects audio, clears live indicators and reports the error. Press Play to create a fresh engine. If the failure repeats, remove the named module before restarting. This recovery does not protect against infinite loops or make arbitrary module code safe to execute.

## Architecture and custom modules

Each module lives in one folder under `src/modules/`. Its `Panel.tsx` is a React component built from shared controls; its `processor.js` runs separately on the audio thread. See [the module contributor guide](modules.md) for the contract and an example.

```text
src/modules/filter/
  definition.js       Ports, parameter ranges, defaults, saved-data migrations
  Panel.tsx           React panel using shared knobs and switches
  processor.js        Audio behavior and per-instance processor state
  panel.module.css    Scoped panel styling
  index.ts            Panel entry point
```

- `src/components/controls/`: reusable knobs, switches, step sliders, and bindings to module state.
- `src/components/rack/`: common panel frame and jacks. The host renders any registered module.
- `src/components/Rack.tsx`: canvas, patching, dragging, undo, and state updates.
- `src/modules/types.ts`: the shared module contract, including optional display telemetry and custom saved data.
- `src/lib/modules.ts` and `src/lib/storage.ts`: patch creation, validation, localStorage persistence, and recovery. Existing v2 sequence data is migrated into the module's own `data` field.
- `src/audio/engine.js`: graph ordering, one-sample delay on feedback edges, parameter smoothing, and output limiting. No module-specific branches.
- `src/audio/scope.js`: selected-jack sampling, with min/max buckets to retain short pulses and audio peaks.
- `src/lib/placement.ts`: nearby gap placement and saved-panel overlap repair.
- `src/audio/worklet.js` and `src/lib/audio.ts`: browser audio integration. Playback begins only after a user gesture.

`npm run dev` discovers module folders and watches their sources. Build, typecheck, and test commands also generate the registries and copy JavaScript audio sources into `public/runtime/`. Generated files should not be edited by hand. Restart an already-running dev server once after adopting this architecture to enable the watcher.

This provides a source-level contribution boundary for future vibe coding. There is no in-app generation interface or runtime loading of generated code yet. A future generation workflow should validate definitions and audio performance, preserve stable port IDs, migrate settings, and support rollback. Worklets alone do not isolate a module's CPU budget.

The proposed database, package loading, execution, and publishing design is saved in [the module platform architecture note](module-platform-architecture.md). Platform implementation is deferred while we iterate on the core rack experience.

Signals use Eurorack-style voltages: roughly ±5V nominal audio, 1V/oct pitch with 0V at C4 before tuning, and 5V or 10V gates/envelopes depending on the module. All ports carry sample-rate voltages. One source per input; one output can fan out. New cable connections can change the signal abruptly. Feedback graphs use explicit one-sample delays. This is a small prototype, not hardware emulation or a VCV plugin host.

## Verify and deploy

```sh
npm run format:check
npm test
npm run typecheck
npm run build
npm start
```

The production build exports `out/`. Deploy that directory at a site's root with any static HTTPS host (or use a Next.js host). AudioWorklet needs HTTPS or localhost. No backend or API keys are required. This app does not currently include a service worker; serve the local files to use it without internet.

## Contributing and release

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the workflow. CI verifies formatting, UI and DSP types, silent regression tests, the static build and production dependency advisories. Third-party licenses, including fonts, are generated into [public/THIRD_PARTY_NOTICES.txt](../public/THIRD_PARTY_NOTICES.txt) and included in `out/` at build time.

The project license must be selected before the public open-source release. Hardware references describe functional inspiration; the panels and processors are original digital implementations, not manufacturer-endorsed emulations.

## Transport, master output and recording

The fixed top bar has physical Play/Pause, Stop and Record buttons. Play resumes the current patch; Pause suspends it; Stop rewinds all processor state. Space toggles Play/Pause when the canvas has focus.

Patch your final signal into the fixed L/MONO and R jacks beside the level knob. L/MONO feeds both speakers until R is patched. Level and mute are saved with the rack and support undo. The original HOME output migrates into this bar, preserving its ID, wiring and settings. Additional HOME modules in older multi-output patches remain visible so existing mixes are preserved. HOME is no longer offered by the picker.

Record starts transport if needed and captures the bounded stereo master as 16-bit PCM WAV at the audio context's native sample rate. Press Finish to end a take and download it locally while playback continues. Pause or Stop also finishes and downloads the recording. Recordings include output level and mute; no microphone, backend, upload or audio file is stored in localStorage. The timer reports captured audio time.

Each take automatically finishes and downloads at ten minutes or 64 MiB of PCM data, whichever comes first, to bound browser memory. A processor failure salvages chunks already received. Finish a take before closing or refreshing the tab; recordings are not persistent and navigation can prevent downloading.
