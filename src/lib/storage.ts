import { STORAGE_KEY, starterPatch, validatePatch, type Patch } from './modules';
import { repairPanelOverlaps } from './placement';
export function restoreRack(storage: Pick<Storage, 'getItem' | 'setItem'>): {
  patch: Patch;
  recovered: boolean;
} {
  const saved = storage.getItem(STORAGE_KEY);
  if (!saved) return { patch: starterPatch(), recovered: false };
  try {
    return { patch: repairPanelOverlaps(validatePatch(JSON.parse(saved))), recovered: false };
  } catch {
    storage.setItem(`${STORAGE_KEY}:recovery`, saved);
    return { patch: starterPatch(), recovered: true };
  }
}
export function saveRack(storage: Pick<Storage, 'setItem'>, patch: Patch) {
  storage.setItem(STORAGE_KEY, JSON.stringify(patch));
}
