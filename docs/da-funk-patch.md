# Local Da Funk patch

The default playground is now a patchable performance loop of Daft Punk's **Da Funk**, at 111 BPM. It combines the main riff, acid line, sub-bass and synthesised drums immediately, rather than reproducing the original song's gradual arrangement. The tutorial and previously saved racks keep their patches. Nothing has been pushed or deployed.

## Sources

- [Community MIDI transcription, Midis101](https://midis101.com/free-midi/9361-daft-punk-da-funk): track 2 supplies the first four bars of the main riff, including rests and note lengths. Track 6 supplies the pulsing G2 bass; track 5 supplies quarter-note kicks. The file sets a tempo of approximately 111.0002 BPM; the patch uses 111. SHA-256: `4147360f19ed49c5a51a7bd9a39cc18968e3a94930c1a0f47fda0bd3d18e9a1f`.
- [Andrew Olney's modular synthesis book, TB-303 chapter](https://github.com/aolney/ct-modular-book/blob/master/13-tb-303.Rmd): the linked `images/303-da-funk-pattern.png` supplies all 16 acid pitches, octave switches, accents and slides. Diagram SHA-256: `1141cb673d134cb68a526047b4637a8f88b3bebc5203a80db28db8c81cfd3f59`.
- [Reverb Machine's Homework recreation](https://reverbmachine.com/blog/daft-punk-homework-synth-sounds/): the main riff's two pitches a fourth apart, band-pass filtering and distortion inform the lead's signal path. Its interpretation of the acid sequence differs from Olney's; this patch consistently uses Olney's G-centred transcription alongside the G-minor community MIDI.
- [Matthew Cieplak's modular recreation](https://matthewcieplak.com/post/projects/daft_punk/): a practical reference for separating the main riff, acid synth and percussion into independent voices.

These are community recreations, not an official score. The sound design, drum sounds and combined arrangement are an interpretation for Ostra's modules. There are no samples from the commercial recording or embedded audio backing tracks.

## What the cables do

| Part          | Signal path                                                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Main riff     | 64-stage PATH → two ORBITs a fourth apart → BRAID sum → SIEVE band-pass → GRIT distortion → BLOOM-controlled VEIL             |
| Acid          | 16-stage PATH with slides → pulse-wave ORBIT → resonant SIEVE → GRIT → separate BLOOM/VEIL amplitude envelope                 |
| Acid movement | SPROUT filter envelope + a separate PATH accent lane + slow DRIFT sine, summed in BRAID, control SIEVE's cutoff               |
| Bass          | Quarter-note SPLIT output → SPROUT's second envelope → filtered G2 saw wave; the same envelope opens the filter and amplitude |
| Kick          | PULSE track A → SPROUT's two envelopes: a fast pitch drop and a longer amplitude decay around a sine oscillator               |
| Snare / hats  | PULSE tracks B/C → separate SPROUT envelopes → band-passed / high-passed CHANCE noise through dual VEIL                       |
| Mix           | Three melody channels and a separate drum bus meet at the master HARBOUR; melody sends feed ECHO and HALO                     |

Lead notes occupy their full MIDI durations and release on rests. Acid slides are encoded on the destination stage, with a full-length gate on the preceding stage so the amplifier stays open during a slide. Accents occupy stages 5, 6, 7, 8 and 12. The acid filter envelope and amplitude envelope are separate, allowing the filter to decay without muting a chain of sliding notes.

All three PATHs receive the same sixteenth-note clock. The 64-stage lead repeats every four bars, while the acid and accent patterns repeat every bar. Drums use quarter-note kicks, backbeats on beats two and four, and eighth-note hats. This deliberately simplifies the original sampled breaks and omits the sampled horn stab.
