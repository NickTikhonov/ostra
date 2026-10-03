import { tutorialDemo } from './tutorial-demo';
import {
  createModule,
  DEFINITIONS,
  validatePatch,
  type Patch,
  type ModuleType,
  type RackModule,
} from './modules';

import { TUTORIAL_KEY } from './modules';
export { TUTORIAL_KEY };
export type Target =
  | { module: ModuleType; port: string; direction: 'in' | 'out' }
  | { module: ModuleType; param: string };
type CableGoal = {
  kind: 'cable';
  from: ModuleType;
  out: string;
  to: ModuleType;
  input: string;
  reverse?: boolean;
  pick?: Target;
  remove?: { to: ModuleType; input: string };
};
type KnobGoal = {
  kind: 'knob';
  module: ModuleType;
  param: string;
  value: number;
  min?: number;
  max?: number;
};
export type Lesson = {
  chapter: string;
  title: string;
  explain: string;
  action: string;
  listen: string;
  discovery: string;
  introduce?: { type: ModuleType; params: Record<string, number> }[];
  goal: CableGoal | KnobGoal;
};
export const LESSONS: Lesson[] = [
  {
    chapter: 'SOUND',
    title: 'Start with a single tone',
    explain:
      'We’ll build a patch from scratch, starting with one wave. ORBIT makes that wave; your first cable will give it a path to the speakers.',
    action:
      'Press Listen and watch ORBIT’s wave. Then click SINE and L / MONO in the top bar to hear it.',
    listen: 'A smooth, steady tone. Start quiet: the master level is set low.',
    discovery:
      'The wave was already there. Your cable gave it a path to the speakers. Compare ORBIT and MASTER IN in the microscope.',
    goal: { kind: 'cable', from: 'oscillator', out: 'sine', to: 'output', input: 'left' },
  },
  {
    chapter: 'SOUND',
    title: 'Pitch is speed',
    explain:
      'TUNE changes how fast the oscillator repeats. Faster vibrations sound higher; slower ones sound lower.',
    action: 'Drag ORBIT’s TUNE knob upwards until it reaches −5 st or higher. Arrow keys work too.',
    listen: 'The same smooth sound climbing in pitch.',
    discovery: 'Pitch and loudness are different things. This knob changed frequency, not volume.',
    goal: { kind: 'knob', module: 'oscillator', param: 'tune', value: -5, min: -5 },
  },
  {
    chapter: 'SOUND',
    title: 'Same note, different colour',
    explain:
      'An oscillator can make several shapes at once. A saw wave includes extra frequencies called harmonics, making it brighter than a sine.',
    action:
      'Connect ORBIT’s SAW output to the same L / MONO input. The old connection is replaced.',
    listen: 'A buzzy edge, even though the pitch has not changed.',
    discovery:
      'The waveform gives a sound its character. One input takes one cable; outputs can feed several destinations.',
    goal: { kind: 'cable', from: 'oscillator', out: 'saw', to: 'output', input: 'left' },
  },
  {
    chapter: 'TONE',
    title: 'Send sound through a filter',
    explain:
      'SIEVE removes frequencies from a sound. First give its SIGNAL input something to shape. Your direct connection to the speakers stays in place while you build this new path.',
    action:
      'Click SIEVE SIGNAL first, then ORBIT SAW. Starting at the empty input adds a cable without picking up the existing one.',
    listen:
      'The same unfiltered buzz for now: the filter is receiving sound, but you are not hearing its output yet.',
    discovery:
      'A filter needs an input. It shapes the oscillator’s sound rather than making the note itself.',
    introduce: [{ type: 'filter', params: { cutoff: 6500, resonance: 0.18, depth: 0.5 } }],
    goal: {
      kind: 'cable',
      from: 'oscillator',
      out: 'saw',
      to: 'filter',
      input: 'in',
      reverse: true,
    },
  },
  {
    chapter: 'TONE',
    title: 'Listen through the filter',
    explain:
      'Now complete the new signal path. Patching SIEVE to the master replaces the direct oscillator connection.',
    action: 'Connect SIEVE LOW → L / MONO in the top bar.',
    listen: 'A bright tone through the filter. Its cutoff starts wide open.',
    discovery:
      'You wired both sides: ORBIT → SIEVE → speakers. A processor needs an input and an output connection.',
    goal: { kind: 'cable', from: 'filter', out: 'low', to: 'output', input: 'left' },
  },
  {
    chapter: 'TONE',
    title: 'Take away the brightness',
    explain:
      'A low-pass filter lets low frequencies through and reduces higher ones. CUTOFF sets where that change starts.',
    action: 'Drag SIEVE’s CUTOFF down to 1.2 kHz or below.',
    listen:
      'The bright buzz becomes rounder and darker. Sweep back up to hear the harmonics return.',
    discovery: 'Subtractive synthesis starts with a rich sound, then takes frequencies away.',
    goal: { kind: 'knob', module: 'filter', param: 'cutoff', value: 900, max: 1200 },
  },
  {
    chapter: 'VOLUME',
    title: 'Add a controllable volume stage',
    explain:
      'A VCA changes the level of a signal. VEIL arrives unpatched, with BIAS open. First send your filtered sound into channel A.',
    action: 'Click VEIL IN A first, then SIEVE LOW. This adds a second destination for the filter.',
    listen: 'The existing filtered tone. VEIL will enter the listening path in the next step.',
    discovery:
      'The filter now feeds both the speakers and VEIL. One output can feed several inputs.',
    introduce: [{ type: 'vca', params: { gain: 1, depth: 1, curve: 0 } }],
    goal: { kind: 'cable', from: 'filter', out: 'low', to: 'vca', input: 'in', reverse: true },
  },
  {
    chapter: 'VOLUME',
    title: 'Listen through the VCA',
    explain:
      'Complete the volume stage by connecting its output to the speakers. The VCA starts fully open, so it should pass the sound unchanged.',
    action: 'Connect VEIL OUT A → L / MONO in the top bar.',
    listen: 'The same filtered tone, now travelling through VEIL.',
    discovery: 'Your audio path is oscillator → filter → VCA → speakers.',
    goal: { kind: 'cable', from: 'vca', out: 'out', to: 'output', input: 'left' },
  },
  {
    chapter: 'VOLUME',
    title: 'Turn the sound down',
    explain: 'BIAS opens the VCA by hand. Soon another voltage will do this job for us.',
    action: 'Lower VEIL’s upper BIAS knob to 35% or below.',
    listen: 'A quieter version of the same tone. At zero, the VCA closes completely.',
    discovery: 'The oscillator keeps running even when the VCA makes it silent.',
    goal: { kind: 'knob', module: 'vca', param: 'gain', value: 0.3, max: 0.35 },
  },
  {
    chapter: 'MOVEMENT',
    title: 'Let voltage turn the knob',
    explain:
      'DRIFT is a slow oscillator: an LFO. Its voltage moves too slowly to be a musical note here. Feed it into CV A and it controls VEIL’s volume.',
    action: 'Connect DRIFT SINE → VEIL CV A.',
    listen: 'The tone swelling and fading by itself. This is amplitude modulation, or tremolo.',
    discovery: 'Audio is the sound. Control voltage (CV) changes something about that sound.',
    introduce: [{ type: 'lfo', params: { rate: 0.6, depth: 5 } }],
    goal: { kind: 'cable', from: 'lfo', out: 'sine', to: 'vca', input: 'cv' },
  },
  {
    chapter: 'MOVEMENT',
    title: 'Same movement, new destination',
    explain:
      'The meaning of a voltage depends on where you patch it. The same LFO can move brightness instead of volume. VEIL will return to the steady level you set with BIAS.',
    action: 'Click the connected VEIL CV A jack to pick up that cable end, then click SIEVE FREQ.',
    listen: 'A slow “wah” as the filter opens and closes, instead of the volume pulsing.',
    discovery: 'Repatching a cable changes the instrument. CV is not tied to a single job.',
    goal: {
      kind: 'cable',
      from: 'lfo',
      out: 'sine',
      to: 'filter',
      input: 'cutoff',
      pick: { module: 'vca', port: 'cv', direction: 'in' },
      remove: { to: 'vca', input: 'cv' },
    },
  },
  {
    chapter: 'NOTES',
    title: 'Give the envelope a clock',
    explain:
      'PATH and BLOOM arrive with no cables. PATH’s internal clock sends gates: high and low voltages that say when a note starts and ends. BLOOM turns those gates into a rising and falling voltage.',
    action: 'Connect PATH GATE → BLOOM GATE.',
    listen:
      'Your drone continues. This cable provides timing; the envelope is not controlling the sound yet.',
    discovery: 'A gate says “when”. An envelope says “how the level changes over time”.',
    introduce: [
      { type: 'envelope', params: { attack: 0.008, decay: 0.12, sustain: 0.35, release: 0.14 } },
      { type: 'sequencer', params: { tempo: 86 } },
    ],
    goal: { kind: 'cable', from: 'sequencer', out: 'gate', to: 'envelope', input: 'gate' },
  },
  {
    chapter: 'NOTES',
    title: 'Give each note a beginning and end',
    explain:
      'BLOOM now follows PATH’s gates. Patch its envelope to VEIL so that this rising and falling voltage controls the volume.',
    action: 'Connect BLOOM ENV → VEIL CV A.',
    listen: 'Repeating swells above the quiet drone. BIAS still holds the VCA partly open.',
    discovery:
      'The envelope adds movement to the level you set by hand. Next, let it close the VCA completely between notes.',
    goal: { kind: 'cable', from: 'envelope', out: 'env', to: 'vca', input: 'cv' },
  },
  {
    chapter: 'NOTES',
    title: 'Let the notes fall silent',
    explain:
      'BIAS holds the VCA open even when the envelope falls to zero. Lower it fully so only the envelope opens the VCA.',
    action: 'Turn VEIL’s upper BIAS all the way down to 0%.',
    listen: 'Separate notes with quiet gaps, instead of swells over a drone.',
    discovery:
      'The oscillator keeps running. The envelope and VCA give each note its beginning and end.',
    goal: { kind: 'knob', module: 'vca', param: 'gain', value: 0, max: 0 },
  },
  {
    chapter: 'NOTES',
    title: 'Soften the attack',
    explain:
      'ATTACK is how long the envelope takes to rise. A short attack gives a sharp start; a longer one lets the note bloom.',
    action: 'Raise BLOOM’s ATTACK to 120 ms or more. Try around 180 ms first.',
    listen: 'The hard edge becomes a soft swell at the beginning of each note.',
    discovery: 'ADSR means attack, decay, sustain and release—the shape of a note, not its pitch.',
    goal: { kind: 'knob', module: 'envelope', param: 'attack', value: 0.18, min: 0.12 },
  },
  {
    chapter: 'MELODY',
    title: 'Turn voltage into a melody',
    explain:
      'PATH also steps through a sequence of voltages. We have set up eight notes. ORBIT’s 1V/OCT input interprets one extra volt as one octave higher.',
    action: 'Connect PATH CV → ORBIT 1V/OCT.',
    listen:
      'The repeating rhythm becomes a melody. The gate cable handles timing; this cable handles pitch.',
    discovery:
      'A sequencer sends control voltages, not audio. Pitch, rhythm and sound generation are separate jobs.',
    goal: { kind: 'cable', from: 'sequencer', out: 'pitch', to: 'oscillator', input: 'pitch' },
  },
  {
    chapter: 'SPACE',
    title: 'Put your instrument in a room',
    explain:
      'HALO adds reflections after the voice. It arrives unpatched. First feed your finished sound into it, leaving your listening path intact.',
    action:
      'Click HALO L/MONO first, then VEIL OUT A. Keep the direct master cable in place for now.',
    listen: 'The dry melody for now. Next you will connect HALO’s outputs to hear the room.',
    discovery:
      'You have sent sound into the effect. Its output still needs a path to your speakers.',
    introduce: [{ type: 'reverb', params: { mix: 0.28, decay: 2.4 } }],
    goal: { kind: 'cable', from: 'vca', out: 'out', to: 'reverb', input: 'left', reverse: true },
  },
  {
    chapter: 'SPACE',
    title: 'Hear the room',
    explain:
      'Replace the dry master connection with HALO’s left output. L / MONO sends this signal to both speakers until you connect the right side.',
    action: 'Connect HALO LEFT → L / MONO in the top bar.',
    listen: 'A tail around each note, filling the gaps with space.',
    discovery:
      'The reverb is now in your listening path. Try MIX to compare the dry voice with the reflections.',
    goal: { kind: 'cable', from: 'reverb', out: 'left', to: 'output', input: 'left' },
  },
  {
    chapter: 'SPACE',
    title: 'Open the room into stereo',
    explain:
      'HALO makes different reflections for the left and right channels. Give its right output a separate path to your right speaker.',
    action: 'Connect HALO RIGHT → R in the top bar.',
    listen:
      'The reflections spreading across the stereo field. Headphones make this easiest to hear.',
    discovery:
      'Every cable in this instrument is yours: sound, tone, volume, movement, rhythm, melody and space.',
    goal: { kind: 'cable', from: 'reverb', out: 'right', to: 'output', input: 'right' },
  },
];
export const tutorialId = (type: ModuleType) => `learn-${type}`;
function find(p: Patch, type: ModuleType): RackModule | undefined {
  return type === 'output' ? p.output : p.modules.find((m) => m.id === tutorialId(type));
}
function add(p: Patch, type: ModuleType, params: Record<string, number> = {}) {
  let m = find(p, type);
  if (!m) {
    m = {
      ...createModule(type),
      id: tutorialId(type),
      x: Math.max(
        42,
        ...p.modules.map((existing) => existing.x + DEFINITIONS[existing.type].width + 12),
      ),
      y: 42,
    };
    p.modules.push(m);
  }
  Object.assign(m.params, params);
  return m;
}
function wire(p: Patch, from: ModuleType, out: string, to: ModuleType, input: string) {
  p.cables = p.cables.filter((c) => !(c.to === tutorialId(to) && c.toPort === input));
  p.cables.push({
    id: `learn-${from}-${out}-${to}-${input}`,
    from: tutorialId(from),
    fromPort: out,
    to: tutorialId(to),
    toPort: input,
    color: ['lfo', 'envelope', 'sequencer'].includes(from) ? '#d6b95f' : '#83afa1',
  });
}
// Advancing only introduces unpatched modules. Existing positions, settings and
// cables are owned by the learner; there is no lesson-specific reflow or zoom.
export function prepareLesson(patch: Patch, index: number): Patch {
  const p = structuredClone(patch);
  for (const module of LESSONS[index]?.introduce ?? []) {
    if (!find(p, module.type)) {
      const m = add(p, module.type, module.params);
      if (module.type === 'sequencer') {
        m.data.rangeMin = 0;
        m.data.rangeMax = 1;
      }
    }
  }
  return p;
}
export function completeLesson(patch: Patch, index: number): Patch {
  const p = structuredClone(patch),
    goal = LESSONS[index]?.goal;
  if (!goal) return p;
  if (goal.kind === 'knob') {
    const m = find(p, goal.module);
    if (m) m.params[goal.param] = goal.value;
  } else {
    if (goal.remove)
      p.cables = p.cables.filter(
        (c) => !(c.to === tutorialId(goal.remove!.to) && c.toPort === goal.remove!.input),
      );
    wire(p, goal.from, goal.out, goal.to, goal.input);
  }
  return p;
}
export function lessonComplete(p: Patch, index: number): boolean {
  const goal = LESSONS[index]?.goal;
  if (!goal) return true;
  if (goal.kind === 'knob') {
    const value = find(p, goal.module)?.params[goal.param];
    return (
      value !== undefined &&
      (goal.min === undefined || value >= goal.min) &&
      (goal.max === undefined || value <= goal.max)
    );
  }
  return (
    p.cables.some(
      (c) =>
        c.from === tutorialId(goal.from) &&
        c.fromPort === goal.out &&
        c.to === tutorialId(goal.to) &&
        c.toPort === goal.input,
    ) &&
    (!goal.remove ||
      !p.cables.some(
        (c) => c.to === tutorialId(goal.remove!.to) && c.toPort === goal.remove!.input,
      ))
  );
}
export function lessonTargets(index: number): Target[] {
  const goal = LESSONS[index]?.goal;
  if (!goal) return [];
  if (goal.kind === 'knob') return [{ module: goal.module, param: goal.param }];
  const targets: Target[] = [
    goal.pick ?? { module: goal.from, port: goal.out, direction: 'out' },
    { module: goal.to, port: goal.input, direction: 'in' },
  ];
  return goal.reverse ? targets.reverse() : targets;
}
export function targetSelector(target: Target): string {
  return 'param' in target
    ? `[data-module-id="${tutorialId(target.module)}"] [data-param="${target.param}"]`
    : `[data-module="${tutorialId(target.module)}"][data-port="${target.port}"][data-direction="${target.direction}"]`;
}
export function tutorialCheckpoint(index: number, width = 1100, height = 800): Patch {
  if (index === -1) return tutorialDemo(width, height);
  const output = { ...createModule('output'), id: tutorialId('output') };
  output.params.level = 0.28;
  let p: Patch = {
    version: 2,
    modules: [{ ...createModule('oscillator'), id: tutorialId('oscillator'), x: 42, y: 42 }],
    output,
    cables: [],
    zoom: Math.max(
      0.5,
      Math.min(
        0.8,
        (width - 40) / 320,
        (height - (width <= 760 ? height * 0.45 + 160 : 390)) / 422,
      ),
    ),
  };
  for (let i = 0; i <= Math.min(index, LESSONS.length - 1); i++) {
    p = prepareLesson(p, i);
    if (i < index) p = completeLesson(p, i);
  }
  return p;
}
export function saveTutorial(storage: Pick<Storage, 'setItem'>, patch: Patch, step: number) {
  storage.setItem(
    TUTORIAL_KEY,
    JSON.stringify({
      ...patch,
      tutorialStep: step,
      tutorialLesson: step === -1 ? 'intro' : (LESSONS[step]?.title ?? 'complete'),
    }),
  );
}
export function restoreTutorial(
  storage: Pick<Storage, 'getItem'>,
  width = 1100,
  height = 800,
): { patch: Patch; step: number } {
  try {
    const raw = JSON.parse(storage.getItem(TUTORIAL_KEY) || 'null');
    if (
      !raw ||
      !Number.isInteger(raw.tutorialStep) ||
      raw.tutorialStep < -1 ||
      raw.tutorialStep > LESSONS.length
    )
      throw new Error('Invalid progress');
    // Map the original preview's numeric progress without resetting its rack.
    const legacyTitles = [
      'Start with a single tone',
      'Pitch is speed',
      'Same note, different colour',
      'Send sound through a filter',
      'Take away the brightness',
      'Add a controllable volume stage',
      'Turn the sound down',
      'Let voltage turn the knob',
      'Same movement, new destination',
      'Give each note a beginning and end',
      'Soften the attack',
      'Turn voltage into a melody',
      'Put your instrument in a room',
      'complete',
    ];
    if (raw.tutorialStep === -1 && raw.tutorialLesson === 'intro')
      return { patch: tutorialDemo(width, height), step: -1 };
    const title = raw.tutorialLesson ?? legacyTitles[raw.tutorialStep];
    const step =
      title === 'complete' ? LESSONS.length : LESSONS.findIndex((l) => l.title === title);
    if (step < 0) throw new Error('Unknown lesson');
    return { patch: validatePatch(raw), step };
  } catch {
    return { patch: tutorialDemo(width, height), step: -1 };
  }
}
