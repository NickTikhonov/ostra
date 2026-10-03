import { lessonTargets, targetSelector, type Target } from '@/lib/tutorial';
import { DEFINITIONS, type Patch } from '@/lib/modules';

export function targetLabel(target: Target) {
  const def = DEFINITIONS[target.module];
  const label =
    'param' in target
      ? def.params.find((p) => p.id === target.param)?.label
      : def[target.direction === 'in' ? 'inputs' : 'outputs'].find((p) => p.id === target.port)
          ?.label;
  return `${target.module === 'output' ? 'MASTER' : def.name} ${label}`;
}

// Move the camera, never the modules or zoom. Only the rack's scroller moves.
export function revealTargets(targets: Target[], smooth = true) {
  const viewport = document.querySelector<HTMLElement>('.canvas-viewport');
  if (!viewport) return;
  const rect = viewport.getBoundingClientRect();
  const boxes = targets
    .filter((t) => t.module !== 'output')
    .flatMap((target) => {
      const element = document.querySelector(targetSelector(target));
      if (!element) return [];
      const panel = element.closest('[data-module-id]')?.getBoundingClientRect();
      return [
        panel && panel.width < rect.width - 32 && panel.height < rect.height - 24
          ? panel
          : element.getBoundingClientRect(),
      ];
    });
  if (!boxes.length) return;
  let left = Math.min(...boxes.map((b) => b.left)),
    right = Math.max(...boxes.map((b) => b.right));
  let top = Math.min(...boxes.map((b) => b.top)),
    bottom = Math.max(...boxes.map((b) => b.bottom));
  if (right - left > rect.width - 32 || bottom - top > rect.height - 24) {
    ({ left, right, top, bottom } = boxes[0]);
  }
  const dx =
    left < rect.left + 16 || right > rect.right - 16
      ? (left + right - rect.left - rect.right) / 2
      : 0;
  const dy =
    top < rect.top + 12 || bottom > rect.bottom - 12
      ? (top + bottom - rect.top - rect.bottom) / 2
      : 0;
  viewport.scrollBy({
    left: dx,
    top: dy,
    behavior:
      smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant',
  });
}
export function revealLesson(step: number, patch: Patch) {
  revealTargets(lessonTargets(step, patch));
}
