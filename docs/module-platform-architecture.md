# In-browser module creation and publishing

Status: proposed architecture, deferred while we iterate on the core rack experience.

Recorded: 2026-09-30.

## Product goal

The complete workflow should happen within the website:

```text
Open rack → Describe a module → Generate → Patch and play
                                              ↓
                                    Request changes ↺
                                              ↓
                                     Publish a version
                                              ↓
                                    Others add or remix it
```

The rack is both the instrument and the development environment. The builder should support revisions, rollback, and preservation of compatible controls and cables. Users should not need to download source files or use a separate development tool.

Expressiveness should extend to custom algorithms: Maths-style function generators, granular synthesis, physical modelling, and other advanced instruments. A fixed library of graph primitives must not define the limit of what authors can create.

## Module packages

A module is a self-contained executable package. Its interface can be declarative while its DSP remains programmable.

```text
Manifest        Ports, parameters, defaults, compatibility, resource requirements
Panel           Control layout, styling, optional custom interface artifact
DSP source      Editable algorithm and internal state handling
Compiled DSP    WebAssembly artifact produced by the controlled build pipeline
Assets          Samples, wavetables, images, and other required resources
```

Standard panels should use a shared React renderer for knobs, switches, ports, and other supported components. This avoids generating a separate React application for every ordinary module. Advanced executable interfaces would need a separate sandbox and a narrow parameter/message bridge; they must not execute with the main application's privileges.

The source language, exact compiler toolchain, and custom-interface sandbox are still open decisions. The runtime contract should remain independent of the source language.

## Database and object storage

Separate module identity, immutable versions, and instances placed in scenes. Two instances can share compiled code while retaining independent controls, buffers, and processor state.

Use a relational database for records and structured JSON, with object storage for binaries and large assets.

| Record            | Stored fields                                                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modules`         | ID, owner, name, description, visibility, forked-from ID, published-version ID                                                                                                |
| `module_versions` | Immutable version ID, module ID, parent version, manifest JSON, panel JSON, source files or source-archive reference, SDK/compiler version, build status, artifact references |
| `artifacts`       | Content hash, storage location, size, artifact type: Wasm binary, sample, image, source archive                                                                               |
| `scenes`          | Module instances, cable connections, positions, zoom                                                                                                                          |

The version manifest declares stable port and parameter IDs, defaults, signal channel counts, required assets, state-format version, runtime-interface version, and resource requirements. Build validation results should be associated with the exact artifact that was validated.

Draft revisions and published releases should both resolve to specific immutable packages. Publishing makes an existing validated version discoverable. Updating a module's public version does not change the code referenced by existing scenes.

Authoring conversations are editing context, not a playback dependency. Source and conversation access should follow the project's sharing policy; neither needs to be downloaded simply to play a module.

## Saved scene instances

A scene stores references and per-instance settings rather than duplicating module code:

```json
{
  "instanceId": "grain-17",
  "moduleVersionId": "version-abc123",
  "position": { "x": 240, "y": 42 },
  "parameters": {
    "density": 12,
    "grainSize": 0.08
  },
  "state": {
    "sampleAssetId": "sample-456",
    "region": [0.2, 0.8]
  }
}
```

Cables reference instance IDs and stable port IDs. Settings such as sequence data, sample selection, and selected regions are persistent. Oscillator phase, active grains, and delay-buffer contents are normally transient and restart when the scene loads.

The existing local-first behaviour remains a requirement: refresh retains the rack, settings, and wiring; audio starts paused. Large user sample assets need durable storage separately from the small localStorage scene record. Cloud scene persistence and asset storage should extend that behaviour rather than remove local saving.

## Importing into a scene

```text
Version record → Manifest + panel + compiled DSP + assets
                                    ↓
Scene instance → Saved parameters and state → Running instance
```

On import or scene restoration, the browser:

1. Resolves the exact version and fetches its manifest, panel, compiled DSP, and required assets.
2. Validates runtime compatibility, permissions, resource requirements, and artifact hashes.
3. Renders the panel using shared controls.
4. Compiles/prepares the Wasm artifact outside the audio-rendering thread and caches reusable code.
5. Creates independent instance memory, initializes the processor, and restores its saved settings.
6. Makes the initialized instance available to the rack graph and connects its ports.

The loading lifecycle must keep expensive preparation away from active audio rendering. Shared compiled code does not imply shared mutable DSP memory: each instance gets its own buffers and state. [WebAssembly's module/instance model](https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/Module) supports reusable compiled code and multiple instances.

## Audio execution

Retain a single rack AudioWorklet that owns graph scheduling and cable routing, and extend it to host compiled module instances.

Each module exposes a small, versioned interface, schematically:

```text
initialize(sampleRate, bufferCapacity)
process(frameCount, inputs, outputs, parameters, events)
saveState() / restoreState()
```

The actual Wasm interface uses pointers into preallocated memory. Inputs and outputs are arrays of sample values using the rack's voltage conventions. The host supplies parameter changes, connection flags, and sample-timed events. The processor maintains its own state and writes its outputs.

Within that interface, the algorithm is programmable: a mixer performs arithmetic, a Maths-style module runs interacting envelope and slew states, and a granular synth manages sample buffers and many concurrent grains.

The host processes modules in dependency order and routes their output buffers to downstream inputs. Feedback requires a documented delay policy. Preserving the current engine's one-sample feedback semantics may require sample-sized or smaller block processing within feedback loops; switching everything to whole-block scheduling would change behaviour.

AudioWorklet processing is synchronous on the audio-rendering thread and receives blocks of samples. Code should use the provided block length rather than assume a permanently fixed size. Fetching, compilation, and unbounded allocation must stay out of `process()`. See the [AudioWorklet execution model](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/process) and [Wasm integration patterns](https://developer.chrome.com/blog/audio-worklet-design-pattern).

The browser remains responsible for live audio. The backend handles generation, builds, storage, and publication; it does not need to receive the rack's live audio stream.

## Execution limits and failure handling

WebAssembly supplies memory isolation, but it does not automatically interrupt an infinite loop or guarantee a real-time deadline. The execution boundary requires additional engineering. See the [WebAssembly security model](https://webassembly.org/docs/security/).

The proposed controlled build pipeline should:

- Enforce memory limits and restrict available host imports.
- Instrument executable code with execution-budget checks, including initialization and state restoration.
- Validate generated artifacts and their runtime interface before allowing them to load.
- Ensure module code cannot bypass the platform's limits through an alternate unvalidated artifact.

At runtime, a trapped or over-budget processor should be disabled and its outputs cleared. Invalid numerical outputs should not propagate through the graph. These controls require implementation and validation; compiling to Wasm alone does not provide them.

The same boundary is needed for private previews as for community modules. Build failures should leave the previous working revision available.

## Iteration and publication

Each successful generation produces a candidate package. An in-rack update preserves compatible parameter values, assets, and cables using stable IDs. Incompatible changes require explicit migration or a reset of the affected state. Loading and swap behaviour should avoid putting compilation or large state operations on the active audio path.

Keep revision checkpoints so the user can return to the previous working package. A scene uses a pinned version; a published update is opt-in for existing instances. Remixing creates a new module identity with provenance linking it to the original.

## Relationship to the current implementation

The current project already separates per-module definitions, React panels, and JavaScript processors, with one folder per module. The rack owns routing, parameter smoothing, scopes, persistence, and the AudioWorklet bridge. This is a useful boundary to retain.

The proposed platform would add a versioned package format, dynamic package loader, declarative panel renderer, compiled-DSP interface, controlled build service, and publishing registry. The existing static module registry is not yet that platform, and the current JavaScript processors are trusted repository code.

When platform work resumes, first prove the package format and runtime with BRAID and SPOOL: one demonstrates simple arithmetic and routing; the other demonstrates substantial internal buffers and state. The AI builder can then generate packages for that established runtime.

For now, this document records the direction. Implementation is deferred while work returns to the core rack experience.
