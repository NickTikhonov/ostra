# FIELD modules

FIELD is a family of twenty-two original digital modules. Knobs, switches, jack behaviour and panel materials are shared; each instrument owns its control layout, socket positions, printed signal flow and independent processor. There is no standard patch bay. No manufacturer artwork or logos are used in the current catalogue.

## Modules

| Module                 | Behaviour                                                                                                                                                                                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **VEIL · VCA**         | DC-coupled amplifier for audio or CV. BIAS sets the starting gain; CV adds gain through DEPTH. A 5V control signal opens it fully at the default depth. CURVE blends linear and exponential response.                                                                       |
| **BLOOM · ENV**        | ADSR envelope from GATE, with a separate retrigger input. Outputs a 0–5V envelope, its negative counterpart, and a short pulse at the end of release.                                                                                                                       |
| **DRIFT · LFO**        | Simultaneous sine, triangle, and square outputs. RATE, DEPTH, bipolar/unipolar selection, exponential rate CV, and phase reset. Bipolar square is also usable as a clock.                                                                                                   |
| **BRAID · CV MIXER**   | Three two-input attenuverting mixers, each with A/B gain from −1 to +1. Unpatched inputs supply +5V for offsets. Two switches cascade mixes into the next output. DC-coupled for CV and audio, with bipolar output indicators.                                              |
| **PATH · VOLTAGE / 8** | Eight continuous voltage stages with configurable range, 1–8-stage length, five playback orders, glide, and direct STAGE CV selection. Independent gate probabilities/lengths, rests, skips, and lockable randomisation/mutation.                                           |
| **ORBIT · VCO**        | Simultaneous sine, triangle, saw, and pulse. 1V/oct pitch, coarse/fine tune, exponential FM, pulse width/PWM, and hard sync. Saw and pulse use band-limited edge corrections.                                                                                               |
| **SIEVE · VCF**        | State-variable filter with simultaneous lowpass, bandpass, and highpass outputs. Cutoff, resonance, and signed cutoff-CV depth. LEVEL CV retains the earlier filter's lowpass-output amplitude control for save compatibility.                                              |
| **ECHO · DELAY**       | Fractional delay with filtered, bounded feedback. TIME CV changes the delay exponentially. Patching CLOCK uses the measured pulse interval and the selected ratio. MIX blends dry/wet; WET is available separately. Delay time is limited to four seconds.                  |
| **HALO · REVERB**      | Stereo algorithmic reverb with size, decay, pre-delay, tone, width and mix. Mono input normalisation, decay/mix CV, and a latched or gate-controlled freeze.                                                                                                                |
| **SPOOL · TAPE DELAY** | Tape-inspired lo-fi echo with record saturation, darkening repeats, pitch bends as TIME changes, wow/flutter, wear/dropouts, and hiss. REGEN CV controls feedback; SYNC follows incoming clock intervals. MIX and WET outputs.                                              |
| **GRIT · DISTORTION**  | Cascaded FUZZ, asymmetric RAZOR clipping, or FOLD. DRIVE extends to 96; DIRT adds edge emphasis, bias starvation, asymmetric clipping, and coarse crushing. DRIVE CV, tone filtering, dry/wet blend, four nonlinear processing substeps, and DC blocking on the wet signal. |
| **HOME · OUTPUT**      | Stereo output level and mute. LEFT feeds both channels when RIGHT is unpatched. Mute allows the engine and scopes to keep running without this output sending sound.                                                                                                        |
| **TICK · CLOCK**       | BPM, straight or swung pulses, quarter/eighth/sixteenth/thirty-second rate, RUN input, and reset input/button. RESET OUT precedes the restarted clock edge so downstream dividers can reset reliably.                                                                       |
| **SPLIT · DIVIDER**    | Simultaneous /2, /3, /4, and /8 outputs. Choose short triggers or square gates; OFFSET rotates the division phases. The first clock after reset is count zero.                                                                                                              |
| **PRISM · QUANTISER**  | Four independent 1V/oct CV channels share a scale edited with twelve round note buttons. Each has CV/TRIG inputs, quantised CV and change-pulse outputs. Shared root, presets, octave and transpose CV; live note and channel indicators.                                   |

| **VECTOR · DUAL FUNCTION** | Independent rise/fall functions with trigger, cycling and slew; CV time control, attenuverters and sum/OR outputs. |
| **CHANCE · RANDOM / S&H** | Noise, stepped and smoothed random voltages; external sampling, clock, hold, range and gate probability. |
| **JUNCTION · SWITCH / 4** | Four-to-one selector and one-to-four router with CV addressing, clock advance, reset and selectable stage count. |
| **RELAY · CV DELAY / 4** | Clocked voltage memory, NOW and simultaneous 1–4-clock delay taps, selectable output, hold and reset. |
| **LOGIC · GATES + COMPARE** | AND, OR, XOR and NOT gates alongside an independent voltage comparator with threshold CV and hysteresis. |
| **HARBOUR · STEREO MIX / SEND** | Three mono/stereo channels with pan/balance and sends, a stereo return and main stereo outputs. |
| **GRAIN · SAMPLER** | Local WAV/MP3 playback with one-shot, loop and granular modes, reverse, position/length, tune and grain controls. Assets persist in this browser's IndexedDB. |

Signal kinds are hints: audio, CV, and gates all carry sample-rate voltages and may be patched into one another. Oscillator audio is nominally ±5V. Pitch uses 1V/oct, with 0V at C4 before oscillator tuning. Inputs accept one source; outputs can feed multiple destinations. Feedback edges have a one-sample delay, and the master output is limited.

## PATH voltage sequencing

PATH v3 replaces the pitch-only sequencer in place. Its eight stages store literal voltages within ±10V. The output labelled **CV** retains the internal `pitch` port ID so existing cables survive. Old semitone values migrate to exactly the same voltages (semitones ÷ 12), with a −1…+2V editing range, the same forward/random mode, and external gates following their clock pulse as before. Saved settings, stage data, cables and positions remain in the same local-storage rack.

- **Values:** drag the sliders continuously or type into their voltage readouts. Arrow keys adjust 10mV; Shift + arrow adjusts 1mV. Editing ranges are 0–5V, 0–10V, ±5V, ±10V or custom limits within ±10V. Changing a range does not rescale or erase voltages: out-of-range values remain audible and have underlined readouts; subsequent edits clamp to the chosen range. PRISM provides optional note quantisation downstream.
- **Movement:** LENGTH selects stages 1 through N without deleting later values. ORDER offers forward, random, reverse, ping-pong and random walk. Ping-pong does not duplicate endpoints; random walk chooses an adjacent non-skipped stage and wraps at the ends. Internal RATE runs two steps per beat. A patched CLOCK advances on rising edges instead; RATE then supplies only the initial timing estimate until two external edges establish the interval.
- **STAGE:** 0–5V selects stages 1 through LENGTH in equal voltage bands; signals outside that span clamp to the first/last stage. Continuous mode follows the input immediately, without internal clock retriggers. An external CLOCK can retrigger the selected stage. Sample-on-clock mode reads STAGE on each external edge (or internal tick if CLOCK is unpatched). Addressed skipped stages resolve to the next available stage, wrapping forward. ORDER is used only when STAGE is unpatched.
- **Reset:** clocked traversal restarts from its first stage (last for reverse) on the next external edge, or immediately with the internal clock. Reset and clock on the same sample select that starting stage. Direct stage addressing remains governed by STAGE CV.
- **Glide:** a 0–5-second linear transition from the current voltage to the destination. Each stage can disable glide on arrival. A new destination during glide starts from the current output. Zero is an immediate voltage step.
- **Stage controls:** click a stage number. Choose CV + gate, CV-only rest, or skip. A rest still occupies time and emits voltage; a skip takes no clock interval. Set gate probability and gate length (1–100% of the measured clock interval), toggle glide and lock voltage variation. Global gate chance multiplies the stage's chance. Probability affects gates only, never CV. With every stage skipped, gates stop and CV holds its last value.
- **Gate timing:** new instances use each stage's gate length. External timing uses the previous complete clock interval, so sudden tempo changes take an edge to measure. Settings can instead follow the incoming clock pulse, which is the migrated default for old patches. Editing any stage's gate length opts into stage-length timing. At 100%, neighbouring gates can join without a low sample.
- **Variation:** Random replaces unlocked voltages across the editing range. Mutate offsets them by up to the configured percentage of that range and clamps the result. Locked values stay fixed. The faceplate’s Undo button restores the last variation; rack undo also records edits. Variation undo history is temporary; voltage values, locks and all sequencing settings persist.

PATH uses a compact title strip, CV/GATE outputs below its stage bank, a STAGE address input beside them, and CLOCK/RESET below playback controls. All controls are on its wider faceplate: type minimum/maximum voltages above the sliders, use the right-hand knobs for playback and global probability/variation, and use the STAGE CV and GATE TIME buttons to cycle modes. Click a stage number to select the always-visible control strip below the faders: gate/rest/skip, gate chance, gate length, glide and lock. Mutate, Random and Undo are directly above the faders. There are no side editors, popovers, hidden customisation menus or controls covering the sequence. Playback uses the audio sample clock; editing never starts audio. The active playback stage is runtime state and restarts on a fresh audio engine, rather than being saved with the rack.

```text
TICK → PATH CLOCK; PATH CV → SIEVE cutoff           stepped timbre
TICK → PATH CLOCK; PATH CV → PRISM → ORBIT pitch   quantised melody
DRIFT (unipolar) → PATH STAGE; PATH CV → VEIL CV    scanned volume shape
```

## Mixing CV with BRAID

BRAID follows the three paired mixers, offsets, and switchable cascade described by [Happy Nerding for 3xMIA](https://happynerding.com/3xmia/). Its original mint panel separates the six controls instead of using concentric knobs. The digital version uses a +5V unpatched-input reference and hard output rails at ±10V; it does not model analogue component tolerances.

```text
1A × knob 1A ─┐
1B × knob 1B ─┴─→ OUT 1 ──[1 → 2]──┐
2A × knob 2A ─┐                     │
2B × knob 2B ─┴─────────────────────┴─→ OUT 2 ──[2 → 3]──┐
3A × knob 3A ─┐                                          │
3B × knob 3B ─┴──────────────────────────────────────────┴─→ OUT 3
```

- At the centre, a knob contributes zero. Turn right to scale normally, left to invert. Double-click returns to zero; Shift-drag makes fine adjustments.
- An empty input contributes its knob value times +5V, giving −5V to +5V offset. Patching a cable replaces that reference, even if the patched signal is zero.
- With both link switches off, the outputs are three independent two-input mixes. Enable **1 → 2** for a four-input mix at OUT 2. Enable both links for all six inputs at OUT 3. Earlier outputs remain available, and connecting an output never disconnects its cascade.
- Indicators show positive/negative output activity; hover any output or a connected input for the exact voltage trace. Signals pass linearly at sample rate within the output rails, so the same mixer works for audio, CV, gates, and steady voltages.

For example, patch an LFO into **1A**, set **1A** to +0.5, leave **1B** empty, and set **1B** to +0.5. A ±5V LFO becomes 0–5V at OUT 1. Or patch two LFOs into **1A/1B**, adjust their depths independently, and send OUT 1 to a filter's cutoff input.

Add **CV MIXER · BRAID** from the canvas menu. It starts with all gains at zero and both links off. Its gains, switches, cables, and position save with the rack. No existing rack is replaced.

## Dirt and tape

GRIT's existing parameter and port IDs remain compatible. Older saved settings are retained and receive a DIRT value of 60%; the three mode positions now select FUZZ, RAZOR, and FOLD. New instances start with stronger drive and an 85% wet mix. DIRT at zero removes the starvation gate and crushing; higher settings make quiet tails splutter and add coarser edges. The tone control still lets you darken the result.

Add **TAPE DELAY · SPOOL** from the empty-canvas menu. Patch a voice into SIGNAL, then MIX into an output or another effect. Use WET for parallel routing. It is a digital tape-inspired effect, with these controls:

- **TIME:** 30 ms–2 s on the knob; CV and sync can reach 4 s. A change slews the read head and bends pitch. With SYNC patched, the incoming clock interval replaces the knob; TIME CV still scales it at one octave per volt.
- **REGEN:** feedback up to 112%, with an additional CV input. Above unity, the loop can build into saturation-limited oscillation.
- **DRIVE / TONE:** record-level saturation and playback bandwidth. Filtering sits inside the loop so each repeat becomes darker and thinner.
- **WEAR / WOW:** ageing darkens the tape, adds asymmetric saturation and occasional level dropouts; WOW blends slow pitch wander and faster flutter. Set both to zero for steadier, brighter repeats.
- **HISS / MIX:** adjustable recorded noise and dry/wet balance. Hiss can produce a quiet noise floor even with no input; zero turns it off.

SPOOL does not replace ECHO or alter a saved rack. Like other effects, it saves controls and wiring, but its audio buffer starts empty after refresh. Refresh after processor edits to load the new worklet; playback remains paused until explicitly started.

## First-visit patch

```text
TICK → SPLIT /2 → PATH CV → PRISM → ORBIT pitch
                   PATH gate → BLOOM → VEIL CV
ORBIT saw → SIEVE → GRIT → VEIL → ECHO → fixed master L/MONO
SPLIT /8 → DRIFT reset; DRIFT sine → SIEVE cutoff
TICK → ECHO clock; TICK reset → SPLIT reset
```

This patch is created only when there is no saved rack. Refresh keeps existing modules, settings, cables, sequence data, positions, and zoom, and starts with audio paused. Archived module types remain loadable under original internal IDs. Wider panels can cause old saved positions to overlap; the restore step moves only panels that collide, retaining settings and connections.

## Placement and cables

Remove a module using the small trash button in its top edge. Right-clicking a panel or control does not remove the module. Removal, including its attached cables, can be undone using the notice's Undo action or Cmd/Ctrl+Z. Right-clicking a jack or cable still disconnects it.

Dragging or adding searches free intervals on the nearest row. It chooses the closest fitting position on either side before trying another row, and snaps to an 8px horizontal grid with small module gaps. It does not push other modules around.

Cables are above the panel controls and jack sockets. When the pointer enters a module, only the cable segments crossing that panel fade. Cable hit areas exclude the panels, keeping controls and jacks accessible. Right-click a cable between modules, or its connected jack, to disconnect it.

Click a connected jack to pick up that cable endpoint, then click another jack of the same input/output type to move it. Dragging between those jacks also works. Its opposite endpoint stays fixed. The cable keeps its colour, and reconnecting is a single undoable change; dropping onto an occupied input replaces that input's previous cable. Escape or clicking empty canvas cancels the pending edit and retains the original connection. Audio routing and saved cables change only when the new connection is completed.

When several cables leave an output, clicking it picks up the newest cable, which is drawn on top. Shift-click/drag an output to start an additional cable, or start at a free input and finish at the output. Keyboard Enter/Space also picks up and places cables. Right-click removal keeps its previous behaviour: a cable removes that connection; a jack removes the connections attached to it.

## Voltage inspector

Hover or keyboard-focus any output, even without a cable, or a connected input for 600 ms to reveal the inspector. Leaving hides it immediately and cancels a pending reveal; moving to another jack starts a fresh delay. The floating inspector samples that exact processor voltage, including delayed feedback inputs. Observing an unpatched output does not change its connection flags or internal normalled routing. The same compact display works for audio and CV:

- **4 s history** shows modulation, sequences, gate activity, and the amplitude envelope of audio signals.
- Current voltage, minimum/maximum voltage, and peak-to-peak range help identify DC offsets and unexpected signal levels.

Min/max buckets preserve peaks and short pulses when displaying more samples than there are pixels. Capture starts when selecting a jack; earlier history remains blank. Only one jack is sampled at a time. The inspector does not start audio or persist history. With the transport stopped it shows PAUSED; to inspect silently, mute the fixed master (and any additional legacy HOME outputs) before starting transport.

The faceplate redesign was checked in a silent browser preview and the saved rack, with TypeScript validation and all five storage checks passing. No audio was played or auditioned. Processor code, parameter/port IDs and saved-data formats were unchanged.

## Independent faceplate layouts

The 15 catalogue panels and the SLOPE compatibility panel now use compact titles and their own arrangements. Controls and sockets can share any part of the faceplate. Outputs have dark badges; inputs use dark, readable lettering on the coloured panel. Module removal stays in the title strip. There are no external settings menus.

| Module | Layout                                                                                                                                    |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| VEIL   | Amplifier triangle, large bias control, CV input beside depth, curve and a separate output.                                               |
| BLOOM  | Gate/retrigger at the top, ADSR controls around a printed envelope, complementary outputs below.                                          |
| DRIFT  | Large rate control, rate CV and reset beside the modulation section, waveforms down the right edge.                                       |
| BRAID  | Three horizontal A/B mixer strips with outputs and cascade switches at the right.                                                         |
| PATH   | Stage editing on the left, playback on the right; CV/gate below the sequence and timing inputs below playback.                            |
| ORBIT  | Tuning and modulation controls down the centre, related inputs on the left, simultaneous waveforms on the right.                          |
| SIEVE  | Prominent cutoff, resonance and CV depth in the centre; control inputs and three filter responses on opposite sides.                      |
| ECHO   | Time and feedback loop above tone/mix; clock and time CV beside their controls.                                                           |
| HALO   | Size and decay dominate the top, pre-delay/tone/width form a shaping strip, and freeze/mix sit between the input side and stereo outputs. |
| SPOOL  | Two large time/regen controls suggest tape reels; separate colour and instability rows, with modulation inputs near the tape loop.        |
| GRIT   | Signal in/out flank the drive control; clipping mode and dirt/tone/mix underneath.                                                        |
| HOME   | Stereo inputs feed one large level control and a direct mute button.                                                                      |
| TICK   | Tempo readout and knob, run/clock pair, swing/rate and a reset section.                                                                   |
| SPLIT  | A branching clock tree with individual division outputs and mode/offset to the left.                                                      |
| PRISM  | Two staggered rows of round scale buttons above shared tuning controls; four labelled CV/trigger channel strips below.                    |
| SLOPE  | Rise/fall around a printed slope, with trigger, time CV, cycle and end-of-cycle routing.                                                  |

### Layout references

These are studies of control hierarchy and grouping, not claims of feature or circuit equivalence. No manufacturer artwork, names or logos were copied.

- [Intellijel Quad VCA](https://intellijel.com/shop/eurorack/quad-vca/): group gain, response and CV attenuation by channel.
- [Happy Nerding 3xMIA](https://happynerding.com/3xmia/): paired attenuverters, clear channel grouping and switchable cascading, adapted to separate knobs and horizontal strips in BRAID.
- [Make Noise Maths](https://www.makenoisemusic.com/modules/maths/): organise controls and related patch points around function-generating channels.
- [Intellijel Dixie II+ manual](https://intellijel.com/downloads/manuals/dixie-2-plus_manual_2021.08.01.pdf): distinguish tuning, modulation and simultaneous waveform outputs.
- [Noise Engineering Mimetic Digitalis](https://noiseengineering.us/manuals/mimetic-digitalis/): treat sequencing as editable CV, with variation directly accessible. PATH retains its own eight-stage interface.
- [Intellijel Sealegs](https://intellijel.com/shop/eurorack/sealegs/): make timing, feedback and character controls recognisable groups. ECHO and SPOOL keep their existing, smaller feature sets.
- [Befaco Out V3](https://www.befaco.org/out-v3/): give the output level control a clear visual priority.

Port positions are local module data shared by the jack renderer and cable geometry. The rack no longer guesses input/output rows. Saved patches retain their settings, connections and stable module IDs; overlap repair accommodates changed widths, and the first-visit patch computes positions from those widths.

## PRISM shared-scale quantiser

PRISM v2 has four independent channels, A–D, quantising to one shared scale. The twelve round buttons use the staggered five-over-seven arrangement in the supplied harmonàig reference. [Intellijel Scales](https://intellijel.com/shop/eurorack/scales/) provides a related reference for selectable scale notes and quantisation feedback; [Shakmat Bard Quartet](https://shakmat.com/products/bard-quartet/) illustrates four-channel quantising. PRISM has an original faceplate and its own simpler shared-scale behaviour.

- **Note buttons:** green means allowed; a brighter gold button shows a current output note. Small coloured dots identify A–D, including multiple channels on the same note. The channel strip also shows the actual note and octave. A short glow marks quantisation events; stopped or unused channels show no live indicators. At least one scale note must remain enabled.
- **Editing:** click any note to create a custom scale. The SCALE button shows CUSTOM; click it to restore the current preset, then click again to cycle chromatic, major, minor, pentatonic, Dorian, whole tone and fifths. ROOT transposes the entire preset or custom scale. Everything is on the faceplate.
- **Channels:** patch pitch CV into A/B/C/D CV and take that channel's CV output to a VCO's pitch input. An unpatched TRIG follows CV continuously. Patching a channel's TRIG samples on its rising edges and holds between them, including while the shared scale is edited. Each Δ output gives an 8ms pulse when its quantised pitch changes (and on the first sample).
- **Shared controls:** SHIFT adds voltage before quantisation; OCTAVE shifts all outputs afterwards. Inputs use 1V/oct and output voltage is bounded to ±10V. This quantises control voltages, not the detected pitch of an audio recording.
- **Saving:** the custom note mask, preset, root, octave and all cable connections persist. Channel A retains the original `pitch` and `trigger` IDs; `transpose` is unchanged. Old racks retain their tuning, preset and trigger behaviour. New channels use `pitch2`/`trigger2` through `pitch4`/`trigger4`. Live note indicators are transient.

Verification used silent numerical processor tests, saved-rack checks and a browser fixture driven by numerical CV values. No audio playback was started.

## HALO stereo reverb

Add **REVERB · HALO** from the canvas picker. Patch a voice or effect into **L/MONO**, then patch **LEFT** and **RIGHT** to the fixed master L and R jacks. An unpatched R input takes the left signal; a patched R is independent. Outputs include the dry/wet mix. For a send/return patch, set MIX to 100%.

- **SIZE:** changes the internal reflection spacing. Changes slew smoothly and can bend the tail's pitch.
- **DECAY:** nominal low-frequency decay time from 0.2–20 seconds. +5V at DECAY doubles the setting, −5V halves it; the combined range is bounded to 0.15–40 seconds. Damping makes high frequencies fade sooner.
- **PRE-DELAY:** 0–200ms before the wet send enters the reverb. The dry signal is immediate.
- **TONE:** 600Hz–16kHz damping inside the feedback network, from dark to bright tails.
- **WIDTH:** collapses the wet signal to mono at zero and opens it to stereo at 100%. Dry stereo is preserved.
- **MIX:** dry at zero, wet at 100%. MIX CV adds ten percentage points per volt, clamped to the knob's range.
- **FREEZE / HOLD:** the button latches freeze; a gate above 1V at HOLD also engages it. Either can hold the tail. Freeze fades out new excitation and removes decay/damping from the tank. It leaves the dry path available. Release the button and gate to resume normal decay. The nearby lamp shows the processor's freeze state when audio is running.

The processor is an original eight-line feedback delay network with energy-preserving Hadamard mixing, input diffusion, sample-rate-scaled delays, wet-send DC filtering and bounded feedback. It performs no allocations in its sample loop. Control changes are smoothed. The freeze topology follows the general lossless-network principle described in [On Lossless Feedback Delay Networks](https://arxiv.org/abs/1606.07729); stereo normalisation, adjacent CV controls and a direct freeze gate/button were also studied in the [Desmodus Versio manual](https://noiseengineering.us/manuals/desmodus-versio/). HALO is not an emulation of that module.

Knobs, freeze state, position and cables save with the rack. The audio tail is runtime state and starts empty after refresh; a saved frozen module needs to be released before it can capture new sound. Adding HALO does not replace a saved rack or change the first-visit patch. Silent numerical checks cover decay, stereo separation, pre-delay, damping, CV, freeze, extreme settings and 44.1/96kHz operation; browser checks cover layout and stereo patching. No audio was played or auditioned.
