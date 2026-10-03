import { DEFINITIONS, patchModules, type ModuleType, type Patch } from './modules';
import { LESSONS, lessonComplete } from './tutorial';

type Properties = Record<string, string | number | boolean>;
type EventName = 'module_added' | 'cable_patched' | 'tutorial_step_completed';
type Context = { tutorial: boolean; step?: number };
export type EditMethod = 'manual' | 'demo';

/** Called by committed actions, never rendering, playback, or loading a rack. */
export function createRackAnalytics(emit: (event: EventName, properties: Properties) => void) {
  const completed = new Set<number>();
  const send = (event: EventName, properties: Properties) => {
    try {
      emit(event, properties);
    } catch {
      // Analytics must not interrupt patching, even if the transport is blocked.
    }
  };
  const contextProperties = ({ tutorial }: Context): Properties =>
    tutorial ? { context: 'tutorial', tutorial_id: 'onboarding' } : { context: 'playground' };
  const moduleAdded = (type: ModuleType, context: Context) =>
    send('module_added', {
      ...contextProperties(context),
      module_name: DEFINITIONS[type].name,
      module_type: type,
    });

  return {
    resume(patch: Patch, step: number) {
      completed.clear();
      for (let i = 0; i < LESSONS.length; i++) {
        if (i < step || (i === step && lessonComplete(patch, i))) completed.add(i);
      }
    },
    restart() {
      completed.clear();
    },
    introduce(before: Patch, after: Patch, step: number) {
      // Reset checkpoints reconstruct previous lessons. Only count the module
      // introduced by this lesson, not its reconstructed cables or earlier rack.
      const types = step === 0 ? ['oscillator'] : LESSONS[step]?.introduce?.map((m) => m.type);
      for (const module of after.modules) {
        if (types?.includes(module.type) && !before.modules.some((m) => m.id === module.id))
          moduleAdded(module.type, { tutorial: true });
      }
    },
    edit(before: Patch, after: Patch, context: Context, method: EditMethod = 'manual') {
      for (const module of after.modules) {
        if (!before.modules.some((m) => m.id === module.id)) moduleAdded(module.type, context);
      }
      const modules = new Map(patchModules(after).map((m) => [m.id, m]));
      const previous = new Map(before.cables.map((c) => [c.id, c]));
      for (const cable of after.cables) {
        const old = previous.get(cable.id);
        if (
          old &&
          old.from === cable.from &&
          old.fromPort === cable.fromPort &&
          old.to === cable.to &&
          old.toPort === cable.toPort
        )
          continue;
        const from = modules.get(cable.from),
          to = modules.get(cable.to);
        if (!from || !to) continue;
        send('cable_patched', {
          ...contextProperties(context),
          from_module: from.type === 'output' ? 'MASTER' : DEFINITIONS[from.type].name,
          to_module: to.type === 'output' ? 'MASTER' : DEFINITIONS[to.type].name,
          from_module_type: from.type,
          to_module_type: to.type,
          method,
        });
      }
      const step = context.step;
      if (
        context.tutorial &&
        step !== undefined &&
        LESSONS[step] &&
        !completed.has(step) &&
        !lessonComplete(before, step) &&
        lessonComplete(after, step)
      ) {
        completed.add(step);
        send('tutorial_step_completed', {
          tutorial_id: 'onboarding',
          step_index: step,
          step_title: LESSONS[step].title,
          method,
        });
      }
    },
  };
}
