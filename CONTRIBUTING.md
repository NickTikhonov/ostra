# Contributing

Use Node.js 22 or newer and install the locked dependencies with `npm ci`. Run `npm run dev` to start the local rack. Audio starts paused; keep it paused while checking layouts or automating the browser.

## Before submitting a change

```sh
npm run format
npm run typecheck
npm test
npm run build
```

`typecheck` covers React, module definitions, every JavaScript DSP processor, and the worklet host. Tests run in Node with synthetic signals and mocked browser audio APIs; they do not play through the speakers. GitHub Actions also checks formatting, builds the static export and audits production dependencies.

Keep pull requests focused. Explain the changed behaviour and relevant validation. Add regression tests for persistence, routing and DSP changes; a panel-only adjustment usually needs visual inspection instead. Inspect panels at normal rack zoom and with patch cables, checking labels, controls and indicators. Describe browser and listening checks separately from automated checks.

## Modules

Follow [the module contract](docs/modules.md) and the design rules in [AGENTS.md](AGENTS.md). Keep each module in its own folder and reuse shared controls. Preserve parameter and port IDs, and migrate saved data when its schema changes. Generated registries and `public/runtime/` are updated by the development watcher and verification commands.

Keep processing bounded and allocation-free inside the sample loop. Annotate processors with `ModuleProcessor<State>`; do not suppress DSP type errors. The registry's opaque state boundary belongs to the host, not individual modules. Contributions execute as trusted application code. Neither the worklet nor exception recovery is a sandbox or a CPU limit for untrusted modules.

Sample assets live in IndexedDB, separately from rack JSON. Preserve references in live racks, saved/recovery data, imports and undo/redo before deleting assets. Sample maintenance uses shared/exclusive Web Locks to avoid deleting another open tab's assets; unsupported browsers retain assets conservatively.

## Dependencies and notices

Commit `package-lock.json` with dependency changes. Run `npm run notices` after updating dependencies; the build also regenerates `public/THIRD_PARTY_NOTICES.txt`, including original font licenses, so notices travel with the static export. Avoid including recordings, credentials or private samples in a contribution.

## Release status

This is an experimental alpha. Before a public release, confirm the project license, run the checks above from a clean install, and record browser/audio performance checks. The proposed in-browser module publishing platform is documented separately and is not implemented by this contribution workflow.
