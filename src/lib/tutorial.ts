import { tutorialDemo, resizeTutorialDemo } from './tutorial-demo';
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
  then?: CableGoal & { action: string };
  action?: string;
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
  differentFrom?: number;
};
export type Lesson = {
  chapter: string;
  scope?: 'audio' | 'envelope' | 'pitch';
  title: string;
  explain: string;
  action: string;
  actionPaused?: string;
  listen: string;
  discovery: string;
  introduce?: { type: ModuleType; params: Record<string, number> }[];
  goal: CableGoal | KnobGoal;
};
export const LESSONS: Lesson[] = [
  {
    chapter: 'SOUND',
    title: 'Turn electricity into sound',
    explain:
      'Let’s build your first patch! You probably already know that sound is a pressure wave in air. A speaker can create one by moving back and forth, based on electrical voltage signals it receives from its input source.\n\nOur first module is ORBIT — an oscillator: we use it to create voltage oscillations that are high enough frequency to be heard as sound. If we connect the output of ORBIT to the master output, you’ll hear sound!',
    action: 'Click ORBIT’s SINE output, then L / MONO in the master output at the top.',
    listen: 'A smooth, steady tone.',
    discovery:
      'Your cable carries ORBIT’s voltage oscillations to the master output. Your speaker turns them into a smooth, steady tone.',
    goal: { kind: 'cable', from: 'oscillator', out: 'sine', to: 'output', input: 'left' },
  },
  {
    chapter: 'SOUND',
    title: 'Pitch is speed',
    explain:
      'You’ve made your first sound! Now let’s change its pitch.\n\nThe number of oscillations each second is called frequency. More oscillations per second make your speaker move faster, and you hear a higher note. Fewer make a lower note. ORBIT’s TUNE knob lets you change that frequency.',
    action: 'Drag ORBIT’s TUNE knob up and down. Listen to how the pitch changes.',
    actionPaused: 'Press Listen, then drag ORBIT’s TUNE knob up and down to change the pitch.',
    listen: 'The same smooth sound climbing in pitch.',
    discovery:
      'Same oscillator, same cable, different pitch. Keep exploring the knob, then continue when you’re ready.',
    goal: { kind: 'knob', module: 'oscillator', param: 'tune', value: 0, differentFrom: -12 },
  },
  {
    chapter: 'SOUND',
    title: 'Same note, different colour',
    scope: 'audio',
    explain:
      'Two instruments can play the same note and still sound very different. One reason is the shape of their oscillations.\n\nSo far, we’ve used ORBIT’s SINE output: its voltage rises and falls smoothly. The SAW output rises steadily, then drops suddenly. That repeating sharp edge adds higher frequencies, called harmonics, which give it a brighter, buzzier sound. The oscilloscope shows the signal going to your speakers. Let’s watch its shape change without touching TUNE!',
    action:
      'Click ORBIT’s SAW output, then L / MONO in the master output. This replaces your SINE connection.',
    actionPaused:
      'Press Listen, then click ORBIT’s SAW output and L / MONO in the master output. Listen to how the sound changes.',
    listen: 'A buzzy edge, even though the pitch has not changed.',
    discovery:
      'The pitch is the same, but the sound is buzzier. You changed the shape of the oscillation, not how often it repeats.',
    goal: { kind: 'cable', from: 'oscillator', out: 'saw', to: 'output', input: 'left' },
  },
  {
    chapter: 'TONE',
    title: 'Send sound through a filter',
    scope: 'audio',
    explain:
      'Now let’s give that buzzy sound a different character. A filter lets us turn down parts of a sound—for example, its higher frequencies—to make it softer and less bright.\n\nOur next module is SIEVE, a filter. Unlike ORBIT, it needs a signal to work on. We’ll make two connections: one to send ORBIT into SIEVE, and one to send SIEVE to the master output. The oscilloscope will follow the sound you’re hearing.',
    action:
      'Click SIEVE’s SIGNAL input first, then ORBIT’s SAW output. Starting at the empty input adds a cable and keeps your connection to the master output.',
    listen:
      'The same unfiltered buzz for now: the filter is receiving sound, but you are not hearing its output yet.',
    discovery:
      'Your sound now passes through SIEVE before reaching the speakers. Next, let’s turn its CUTOFF knob and see what the filter does.',
    introduce: [{ type: 'filter', params: { cutoff: 6500, resonance: 0.18, depth: 0.5 } }],
    goal: {
      kind: 'cable',
      from: 'oscillator',
      out: 'saw',
      to: 'filter',
      input: 'in',
      reverse: true,
      then: {
        kind: 'cable',
        from: 'filter',
        out: 'low',
        to: 'output',
        input: 'left',
        action:
          'Now click SIEVE’s LOW output, then L / MONO in the master output. This replaces the direct connection from ORBIT.',
      },
    },
  },
  {
    chapter: 'TONE',
    title: 'Take away the brightness',
    scope: 'audio',
    explain:
      'Let’s hear what SIEVE can do! We’re using its LOW output, which lets lower frequencies through and turns down higher ones.\n\nThe CUTOFF knob sets where that filtering begins. Turn it down to remove more of the bright harmonics. You’ll hear a softer, rounder sound, and see the sharp corners of the oscillation become smoother. Turn it back up to bring the brightness back.',
    action:
      'Drag SIEVE’s CUTOFF knob down and back up. Listen to the sound and watch its shape change.',
    actionPaused:
      'Press Listen, then drag SIEVE’s CUTOFF knob down and back up. Watch the shape as you listen.',
    listen:
      'The bright buzz becomes rounder and darker. Sweep back up to hear the harmonics return.',
    discovery:
      'You’re shaping the sound by taking frequencies away. Try a few cutoff settings and keep one you like.',
    goal: { kind: 'knob', module: 'filter', param: 'cutoff', value: 900, differentFrom: 6500 },
  },
  {
    chapter: 'VOLUME',
    title: 'Add a controllable volume stage',
    scope: 'audio',
    explain:
      'We can change the pitch and character of our sound. Now let’s give it a volume control!\n\nVEIL is a voltage-controlled amplifier, or VCA. It changes the size of the voltage oscillations passing through it, making the sound louder or quieter. We’ll start by controlling that level by hand. Later, we’ll use another signal, called control voltage (CV), to change it automatically. VEIL has two channels; we’ll use the upper one, A.',
    action:
      'Click VEIL’s IN A input first, then SIEVE’s LOW output. This adds a cable while keeping your connection to the master output.',
    listen: 'The existing filtered tone. VEIL will enter the listening path in the next step.',
    discovery:
      'Your filtered sound now passes through VEIL before reaching the speakers. It starts at full volume, so you should hear the same sound. Next, let’s turn it down.',
    introduce: [{ type: 'vca', params: { gain: 1, depth: 1, curve: 0 } }],
    goal: {
      kind: 'cable',
      from: 'filter',
      out: 'low',
      to: 'vca',
      input: 'in',
      reverse: true,
      then: {
        kind: 'cable',
        from: 'vca',
        out: 'out',
        to: 'output',
        input: 'left',
        action:
          'Now click VEIL’s OUT A output, then L / MONO in the master output. Your sound will now pass through VEIL.',
      },
    },
  },
  {
    chapter: 'VOLUME',
    title: 'Turn the sound down',
    scope: 'audio',
    explain:
      'Let’s try our new volume control. VEIL’s upper BIAS knob sets how much of the signal passes through channel A. Turn it down and the voltage oscillations get smaller, so the sound gets quieter. At zero, it falls silent.\n\nWatch the oscilloscope as you turn the knob. The oscillations shrink in height, but keep repeating at the same speed: you’re changing the volume, not the pitch. ORBIT keeps oscillating even when you can’t hear it.',
    action:
      'Drag VEIL’s upper BIAS knob down, then back up. Try silence too, and leave it fairly low for the next step.',
    actionPaused:
      'Press Listen, then move VEIL’s upper BIAS knob down and up. Try silence too, and leave it fairly low.',
    listen: 'A quieter version of the same tone. At zero, the VCA closes completely.',
    discovery:
      'You can control the loudness without changing the oscillator. Next, we’ll let a slow oscillation move that level for us.',
    goal: { kind: 'knob', module: 'vca', param: 'gain', value: 0.3, differentFrom: 1 },
  },
  {
    chapter: 'MOVEMENT',
    title: 'Let voltage turn the knob',
    scope: 'audio',
    explain:
      'What if the volume could move by itself? DRIFT is a low-frequency oscillator, or LFO. It creates voltage oscillations just like ORBIT, but we’ve set it much slower—too slow to hear as a tone.\n\nWe can use that slow signal as control voltage (CV): voltage that changes a setting on another module. Connect it to VEIL’s CV A input and it will raise and lower the volume around the level you set with BIAS. You’ll hear the sound swell and fade without touching a knob.',
    action:
      'Click DRIFT’s SINE output, then VEIL’s CV A input in the upper channel. Listen to the volume rise and fall.',
    actionPaused:
      'Click DRIFT’s SINE output, then VEIL’s upper CV A input. Press Listen to hear the volume rise and fall.',
    listen: 'The tone swelling and fading by itself. This is amplitude modulation, or tremolo.',
    discovery:
      'You’ve made your first automatic movement! Both modules produce voltage oscillations. Here, ORBIT supplies the sound and DRIFT controls its volume.',
    introduce: [{ type: 'lfo', params: { rate: 0.6, depth: 5 } }],
    goal: { kind: 'cable', from: 'lfo', out: 'sine', to: 'vca', input: 'cv' },
  },
  {
    chapter: 'MOVEMENT',
    title: 'Same movement, new destination',
    scope: 'audio',
    explain:
      'You’ve used DRIFT to move the volume. What if we send that same slow oscillation to the filter instead?\n\nSIEVE’s FREQ input controls its cutoff frequency—the setting you changed by hand earlier. Move the cable there and the sound will become brighter and darker by itself. VEIL will return to the steady volume set by BIAS. The signal hasn’t changed; what it controls depends on where you connect it.',
    action:
      'Click the connected VEIL CV A input to pick up that cable end, then click SIEVE’s FREQ input. Listen for the brightness rising and falling.',
    actionPaused:
      'Click the connected VEIL CV A input, then SIEVE’s FREQ input. Press Listen to hear the brightness rise and fall.',
    listen: 'Brightness moving instead of volume.',
    discovery:
      'The same control voltage can do different jobs. Try DRIFT’s RATE knob to make this movement faster or slower.',
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
    chapter: 'MELODY',
    title: 'Meet the Sequencer',
    scope: 'pitch',
    explain:
      'So far, you’ve changed pitch by turning ORBIT’s TUNE knob. Our new module, PATH, can play a repeating pattern of pitches for you. It plays a sequence of voltages across eight steps, then repeats. Each step has a fader that lets you set the voltage sent from its CV output.\n\nConnect that changing voltage to ORBIT’s 1V/OCT input and you’ll hear the pitch follow the pattern. The label means “one volt per octave”: one extra volt raises the pitch by an octave, like moving from one C to the next C above it. The display shows PATH’s voltage stepping up and down.',
    action:
      'Click PATH’s CV output, then ORBIT’s 1V/OCT input. Try moving one fader and listen for that pitch to change each time the pattern comes around.',
    actionPaused:
      'Click PATH’s CV output, then ORBIT’s 1V/OCT input and press Listen. Move one fader and listen for that pitch to change each time the pattern comes around.',
    listen: 'A continuous tone stepping through a repeating pattern of pitches.',
    discovery:
      'PATH controls the pitch; ORBIT still makes the sound. Try PATH’s RATE knob to make the pattern faster or slower. The sound keeps going between pitches—for now, we’re only changing which pitch you hear.',
    introduce: [{ type: 'sequencer', params: { tempo: 86 } }],
    goal: { kind: 'cable', from: 'sequencer', out: 'pitch', to: 'oscillator', input: 'pitch' },
  },
  {
    chapter: 'NOTES',
    title: 'Meet the Envelope Generator',
    scope: 'envelope',
    explain:
      'Your melody changes pitch, but each note stays at a steady volume, without swelling or fading. Meet BLOOM, an envelope generator: it creates a rising and falling voltage that can shape each note’s volume, like a hand turning the volume up and down. That changing shape is called an envelope.\n\nBLOOM needs a signal to start each shape. PATH has another output, GATE, which switches on and off at each step—like pressing and releasing a keyboard key. This on-and-off voltage is called a gate. We’ll send it to BLOOM, then send BLOOM’s envelope to VEIL to control the volume.',
    action:
      'Click PATH’s GATE output, then BLOOM’s GATE input. With Listen running, the display will show BLOOM responding. The sound won’t change yet: BLOOM isn’t connected to the volume control.',
    listen: 'Repeating swells once the envelope reaches VEIL.',
    discovery:
      'Each gate now starts an envelope that opens VEIL. You may still hear a steady tone underneath: BIAS holds the volume partly open. We’ll change that next.',
    introduce: [
      { type: 'envelope', params: { attack: 0.008, decay: 0.12, sustain: 0.35, release: 0.14 } },
    ],
    goal: {
      kind: 'cable',
      from: 'sequencer',
      out: 'gate',
      to: 'envelope',
      input: 'gate',
      then: {
        kind: 'cable',
        from: 'envelope',
        out: 'env',
        to: 'vca',
        input: 'cv',
        action:
          'Now let BLOOM move the volume: click its ENV (envelope) output, then VEIL’s upper CV A input. Press Listen if needed and hear the sound swell with each gate from PATH.',
      },
    },
  },
  {
    chapter: 'NOTES',
    title: 'Let the notes fall silent',
    scope: 'envelope',
    explain:
      'Notes need room to end as well as begin. VEIL’s BIAS knob still holds the volume partly open, even when BLOOM’s envelope reaches zero.\n\nTurn BIAS all the way down so the envelope has full control. When the envelope rises, the sound comes through. When it falls back to zero, the sound stops. ORBIT keeps oscillating throughout—we’re deciding when you can hear it.',
    action:
      'Turn VEIL’s upper BIAS knob all the way down. Listen for the quiet gaps between notes.',
    actionPaused:
      'Turn VEIL’s upper BIAS knob all the way down, then press Listen. Listen for the quiet gaps between notes.',
    listen: 'Separate notes with quiet gaps.',
    discovery:
      'Your melody now has separate notes. PATH’s CV chooses their pitches, while BLOOM’s envelope controls how their volume rises and falls.',
    goal: { kind: 'knob', module: 'vca', param: 'gain', value: 0, max: 0 },
  },
  {
    chapter: 'NOTES',
    title: 'Soften the attack',
    scope: 'envelope',
    explain:
      'A plucked string starts sharply; a bowed string can ease into a note. We can shape our notes in the same way. BLOOM’s ATTACK sets how long the envelope takes to rise. Increase it and the sound fades in more gradually.\n\nAfter attack, DECAY lowers the envelope to the SUSTAIN level, which it holds while the gate stays high. RELEASE sets how it fades to zero when the gate ends. For now, just explore ATTACK and watch the rising edge become gentler.',
    action:
      'Drag BLOOM’s ATTACK knob up, then try shorter and longer settings. Listen to the start of each note and watch the envelope.',
    actionPaused:
      'Press Listen, then raise BLOOM’s ATTACK knob. Compare a quick start with a slower fade-in as you watch the envelope.',
    listen: 'A softer beginning to each note.',
    discovery:
      'You’re changing how a note begins, not its pitch. If a long attack makes the notes very quiet, the gate is ending before the envelope can rise fully—try a shorter setting.',
    goal: { kind: 'knob', module: 'envelope', param: 'attack', value: 0.18, differentFrom: 0.008 },
  },
  {
    chapter: 'SPACE',
    title: 'Put your instrument in a room',
    explain:
      'A sound in a room doesn’t stop at your ears. It reflects off the walls and reaches you again, fading over time. Reverb recreates that lingering sound.\n\nHALO is our reverb module. We’ll send VEIL’s output into it, then connect HALO to the master output. You’ll hear the same melody with a fading tail around each note. As before, the first cable feeds the effect; the second lets you hear it.',
    action:
      'Click HALO’s L/MONO input first, then VEIL’s OUT A output. L/MONO accepts a single-channel signal and feeds it into the reverb.',
    listen: 'A fading tail after each note.',
    discovery:
      'Try HALO’s MIX knob to blend between the original sound and the reverb. DECAY changes how long the reflections linger. Find a room you like before continuing.',
    introduce: [{ type: 'reverb', params: { mix: 0.28, decay: 2.4 } }],
    goal: {
      kind: 'cable',
      from: 'vca',
      out: 'out',
      to: 'reverb',
      input: 'left',
      reverse: true,
      then: {
        kind: 'cable',
        from: 'reverb',
        out: 'left',
        to: 'output',
        input: 'left',
        action:
          'Now click HALO’s LEFT output, then L / MONO in the master output. Press Listen if needed to hear the reflections around each note.',
      },
    },
  },
  {
    chapter: 'SPACE',
    title: 'Open the room into stereo',
    explain:
      'So far, both speakers have received the same signal. That’s mono: one channel of sound. Stereo uses separate left and right channels, which can make the sound feel wider.\n\nHALO creates different reflections for each side. Its LEFT output is already connected. Connect RIGHT to the master’s R input to give each speaker its own signal. Listen for the room opening out around your melody; headphones or two speakers make this easiest to hear.',
    action:
      'Click HALO’s RIGHT output, then R in the master output. Compare the sense of space before and after connecting.',
    actionPaused:
      'Press Listen, then connect HALO’s RIGHT output to R in the master output. Listen for the sound spreading out.',
    listen: 'Different reflections in the left and right channels.',
    discovery:
      'Your patch is now stereo. Try HALO’s WIDTH knob to bring the reflections closer together or spread them apart.',
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
function applyGoal(p: Patch, goal: CableGoal | KnobGoal) {
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
}
function goalComplete(p: Patch, goal: CableGoal | KnobGoal): boolean {
  if (goal.kind === 'knob') {
    const value = find(p, goal.module)?.params[goal.param];
    return (
      value !== undefined &&
      (goal.differentFrom === undefined || value !== goal.differentFrom) &&
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
export function activeLessonGoal(p: Patch, index: number) {
  let goal = LESSONS[index]?.goal;
  while (goal?.kind === 'cable' && goal.then && goalComplete(p, goal)) goal = goal.then;
  return goal;
}
/** Used by checkpoints to reconstruct every connection of a completed lesson. */
export function completeLesson(patch: Patch, index: number): Patch {
  const p = structuredClone(patch);
  let goal = LESSONS[index]?.goal;
  while (goal) {
    applyGoal(p, goal);
    if (goal.kind !== 'cable' || !goal.then) break;
    goal = goal.then;
  }
  return p;
}
/** Do it for me demonstrates only the currently highlighted connection. */
export function completeLessonAction(patch: Patch, index: number): Patch {
  const p = structuredClone(patch),
    goal = activeLessonGoal(p, index);
  if (goal) applyGoal(p, goal);
  return p;
}
export function lessonComplete(p: Patch, index: number): boolean {
  let goal = LESSONS[index]?.goal;
  while (goal) {
    if (!goalComplete(p, goal)) return false;
    if (goal.kind !== 'cable' || !goal.then) break;
    goal = goal.then;
  }
  return true;
}
export function lessonTargets(index: number, patch?: Patch): Target[] {
  const goal = patch ? activeLessonGoal(patch, index) : LESSONS[index]?.goal;
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
      (raw.tutorialStep > LESSONS.length && !raw.tutorialLesson)
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
      return { patch: resizeTutorialDemo(validatePatch(raw), width, height), step: -1 };
    const savedTitle = raw.tutorialLesson ?? legacyTitles[raw.tutorialStep];
    const renamedLessons: Record<string, string> = {
      'Start with a single tone': LESSONS[0].title,
      'Listen through the filter': 'Send sound through a filter',
      'Listen through the VCA': 'Add a controllable volume stage',
      'Give each note a beginning and end': 'Meet the Envelope Generator',
      'Give the envelope a clock': 'Meet the Envelope Generator',
      'Meet PATH and BLOOM': 'Meet the Envelope Generator',
      'Meet BLOOM': 'Meet the Envelope Generator',
      'Turn voltage into a melody': 'Meet the Sequencer',
      'Meet PATH': 'Meet the Sequencer',
      'Hear the room': 'Put your instrument in a room',
    };
    const title = renamedLessons[savedTitle] ?? savedTitle;
    let step = title === 'complete' ? LESSONS.length : LESSONS.findIndex((l) => l.title === title);
    if (step < 0) throw new Error('Unknown lesson');
    const patch = validatePatch(raw);
    const pitchStep = LESSONS.findIndex((l) => l.title === 'Meet the Sequencer');
    // Older tutorials taught envelopes before pitch. Let the learner make the
    // missing connection first, preserving every existing module and cable.
    if (LESSONS[step]?.scope === 'envelope' && !lessonComplete(patch, pitchStep)) step = pitchStep;
    return { patch, step };
  } catch {
    return { patch: tutorialDemo(width, height), step: -1 };
  }
}
