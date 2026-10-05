# Previous local Fantas patch

The previous local default playground used the sequences from Endorphin.es' [Fantas recreation tutorial](https://www.youtube.com/watch?v=eXVxFxVZ0co), published 21 October 2022. This is a recreation of Caterina Barbieri's piece, not an artist-supplied score or a verified transcription of the original recording. The tutorial and existing saved playground racks retain their own patches.

Source: [Ground Control project ZIP](https://endorphines.info/files/Caterina_Barbieri_Fantas_GC_211022.zip), SHA-256 `457033ff7ab3478f541015f00fe6e2ce94878b587d1a6f8027cb7a4a50ba9d01`.

| Project file          | Voice    | Length | Step duration  |
| --------------------- | -------- | ------ | -------------- |
| `track1/patternA.txt` | Arpeggio | 13     | Sixteenth note |
| `track2/patternA.txt` | Lead     | 64     | Eighth note    |
| `track3/patternA.txt` | Bass     | 16     | Quarter note   |

The project tempo is 82 BPM. TICK produces sixteenths; SPLIT divides these by two and four for the lead and bass. All phrases repeat independently. PATH retains eight visible faders, with page buttons for longer sequences. New PATH instances still start with eight steps.

The arpeggio is **D5 G4 G4 G5 E♭5 D5 C5 D5 G4 G5 E♭5 D5 C5**, using the project's octave labels. Source `D5#` means E♭5, and `A4#` means B♭4. Its `G8#` rest sentinel suppresses the gate and holds the preceding voltage, including in the bass where rest velocity is still 127.

Lead modifier 1 becomes a full-length gate tying into the next stage; modifier 2 additionally enables glide on arrival at the following stage. Ordinary gates use the source's 50% gate length. No rests are removed or skipped.

Pitch intervals, phrase lengths, rests, ties and tempo follow the downloaded project. Hardware CV does not fix an oscillator's absolute register: the [Ground Control manual](https://endorphines.info/manuals/Ground_Control_manual_v3.pdf) defines C3 as 0 V, while Ostra's oscillator uses C4 at 0 V. This patch expresses the source's printed note labels relative to C4, with the bass oscillator one octave lower. Registers and synthesis settings are an interpretation, not a claim of matching the original recording's sound. The lead's 120 ms linear glide approximates Ground Control's slide; its curve and onset differ. Filter movement, envelopes, delay and reverb are adjusted for Ostra's modules, with an unsynchronised delay as demonstrated in the tutorial.

This work is local only; it has not been pushed or deployed.
