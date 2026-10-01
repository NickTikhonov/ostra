# Archived compatibility modules

These processors were introduced in an earlier hardware-reference revision. They remain registered so saved racks retain their signal behaviour. Their panels now use original names and colours, and they are hidden from the add menu. The current catalogue and first-visit patch are described in [FIELD modules](studio-modules.md).

The original reference names below document the processor history, not current branding or a claim of circuit-level accuracy. These implementations have not been compared against physical hardware.

## Implemented functions and references

| Module  | Implemented front-panel functions                                                                                                                                                                                                                                                                                                                  | Reference                                                                                          |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Maths   | Two rise/fall function generators, trigger and signal/slew inputs, continuous response shaping, manual and voltage-controlled cycling, rise/fall/both CV, four attenuverters, channel 2/3 offset normals, individual and unity outputs, EOR/EOC gates, SUM/inverted SUM/positive OR. Patching a variable channel output removes it from the buses. | [Make Noise manual](https://www.makenoisemusic.com/wp-content/uploads/2024/03/MATHSmanual2013.pdf) |
| A-155   | Two eight-step voltage rows; upper 1/2/4V range; lower scale and eight external audio/CV inputs; two switch rows routing three triggers and a gate; separate pre/post outputs, hold and glide controls; external clock/reset/start/stop and four manual buttons.                                                                                   | [Doepfer manual](https://doepfer.de/a100_man/A155_man.pdf)                                         |
| A-156   | Two quantisers; chromatic channel 1; chromatic/major/minor, scale/chord/fifth, sixth/seventh options on channel 2; continuous or triggered conversion, note-change trigger outputs, shared quantised transpose.                                                                                                                                    | [Doepfer manual](https://doepfer.de/a100_man/A156_man.pdf)                                         |
| A-110-1 | Five octave ranges, tuning, two exponential CV inputs, hard sync, pulse width and two PWM inputs, simultaneous falling saw, pulse, triangle, and rounded sine outputs.                                                                                                                                                                             | [Doepfer reference](https://doepfer.de/a110.htm)                                                   |
| A-124   | Input level, cutoff, resonance, two cutoff CV inputs with CV2 attenuation, bandpass output, continuously mixed low/notch/high output.                                                                                                                                                                                                              | [Doepfer reference](https://doepfer.de/a124.htm)                                                   |
| A-132-3 | Two independent DC-coupled VCAs, initial gain, CV attenuation, linear/exponential response.                                                                                                                                                                                                                                                        | [Doepfer reference](https://doepfer.de/a1323.htm)                                                  |
| A-138a  | Four DC-coupled inputs with individual linear levels and a master level; unpatched input 1 provides a +5V offset.                                                                                                                                                                                                                                  | [Doepfer reference](https://doepfer.de/a138.htm)                                                   |
| A-183-2 | Bipolar voltage offset, attenuation/polarisation switch, amount control, two identical outputs.                                                                                                                                                                                                                                                    | [Doepfer reference](https://doepfer.de/a1832.htm)                                                  |

## Patching the set

```text
Maths CH4 EOC → A-155 clock
A-155 post 1 → A-156 CV 2 → A-110 CV 1
A-155 trig 1 → Maths CH1 trigger
A-110 saw → A-124 input → A-132-3 input 1 → A-138 input 1 → OUT
Maths CH1 unity → A-132-3 CV 1
Maths CH1 unity → A-183-2 → A-124 CV 2
```

This was the earlier first-visit rack. Saved copies remain loadable, with all settings and connections preserved. The current first-visit rack uses the twelve FIELD modules instead.

A-155 has no internal tempo knob: cycle Maths channel 4 and adjust its rise/fall times to set the clock. Use **Trig 1** for repeated envelopes; adjacent enabled **Gate** steps remain high. Glide is enabled by a low control signal, while S&H holds the previous value while its control is high. The sequencer's manual buttons operate while the app transport is running; stopping the app suspends the entire audio engine.

A-156 accepts positive CV. Use the attenuverter's offset to lift a bipolar signal above zero. Its chord modes select individual pitches belonging to a chord; they do not generate polyphony.

## Digital model boundaries

- Maths uses numerical envelopes and slew limiting. Its control laws, extreme response curves, and interactions between simultaneous signal/trigger inputs approximate the analogue core. Audio-rate cycling is supported, but is not an anti-aliased oscillator model.
- A-110 uses band-limited saw/pulse generation and a derived triangle/rounded sine. It does not model component drift, every waveform imperfection, or the physical module's internal rack-bus CV connection.
- A-124 is an oversampled nonlinear state-variable approximation, not a transistor/inverter circuit simulation. Its resonance and distortion need later listening comparison against a Wasp.
- A-132-3 models the unity-gain-limited 3360 variant with an approximate exponential curve. A-138 and A-183-2 use ideal arithmetic with bounded output voltages.
- A-156 uses approximately 500Hz continuous conversion and sample-rate external trigger detection. Channel 1 uses the factory chromatic jumper setting; A-183-2 uses the bipolar offset jumper setting. Internal hardware jumper/resistor modifications are not exposed on the faceplates.
- The host retains its master output limiter, parameter smoothing, and one-sample feedback delay. Graph feedback and out-of-range voltages therefore differ from analogue patching.

Each module owns its definition, faceplate, processor, and stylesheet. The rack knows only port coordinates and the common module contract. See [the contributor guide](modules.md).
