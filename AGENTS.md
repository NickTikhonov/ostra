<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Module design

- Let each module own its layout. Arrange controls and jacks around signal flow: CV beside its control, repeated mixer channels, prominent primary controls. Never impose standard input/output rows or a shared patch bay.
- Reuse knobs, switches, jack behaviour, scopes and saving—not faceplate geometry. Keep each module in its own folder and preserve parameter/port IDs so saved patches survive redesigns.
- Keep all settings on the faceplate, without external customisation menus. Use compact titles and give the space to controls.
- Study real Eurorack modules for functional grouping and hierarchy, then create an original, colourful design rather than copying branding or faceplates.
- Make labels readable at normal rack zoom and distinguish outputs clearly. Printed signal paths should explain the module without crossing labels or obscuring controls.
- Inspect rendered modules both individually and in a patched rack for spacing, clipping and cable occlusion. Keep audio stopped during UI checks.

## Tutorial teaching

- Build intuition from familiar physical ideas, then explain the signal’s journey and why the next action changes what the learner hears. Use warm, conversational prose rather than slogans or terse technical summaries.
- Introduce one concept at a time. Define new terms and spell out acronyms when they first appear; explain what they do before asking the learner to use them.
- Teach through small, audible experiments. Invite exploration and comparison rather than arbitrary numeric targets. Say explicitly when a connection will not change the sound yet, and why.
- Keep attention on the instrument. Preserve the learner’s patch and module positions; guide related wiring actions continuously instead of requiring navigation between every cable. Never silently make the learner’s connections.
- Use only the visual feedback needed for the current idea, with simple, non-interactive displays where possible. Keep instructions focused and retain Reset and Do it for me so learners can recover or see a demonstration.
