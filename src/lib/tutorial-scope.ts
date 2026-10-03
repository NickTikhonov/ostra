import { LESSONS, tutorialId } from './tutorial';
import type { Patch } from './modules';
import type { ProbeTarget } from './scope';

export function lessonScope(step: number) {
  switch (LESSONS[step]?.scope) {
    case 'audio':
      return { label: 'OSCILLOSCOPE', time: 'fast' as const, unipolar: false };
    case 'envelope':
      return { label: 'BLOOM · ENVELOPE', time: 'slow' as const, unipolar: true };
    case 'pitch':
      return { label: 'PATH · PITCH CV', time: 'slow' as const, unipolar: true };
    default:
      return null;
  }
}

/** Select the signal that illustrates this lesson; learners do not configure the scope. */
export function lessonSignal(step: number, patch?: Patch): ProbeTarget | null {
  const scope = LESSONS[step]?.scope;
  if (!scope) return null;
  if (scope === 'audio') {
    const cable = patch?.cables.find((c) => c.to === tutorialId('output') && c.toPort === 'left');
    return {
      id: tutorialId('output'),
      port: 'left',
      direction: 'in',
      key: `tutorial:heard:${cable?.from ?? 'none'}:${cable?.fromPort ?? ''}`,
    };
  }
  const id = tutorialId(scope === 'envelope' ? 'envelope' : 'sequencer');
  const port = scope === 'envelope' ? 'env' : 'pitch';
  return { id, port, direction: 'out', key: `tutorial:${id}:${port}` };
}
