import { STORAGE_KEY, TUTORIAL_KEY, type Patch } from './modules';
import { SAMPLE_LOCK, pendingSampleIds, pruneSamples } from './sample-assets';

type StorageReader = Pick<Storage, 'getItem'>;

/** Protect live history plus saved/recovery racks. Unreadable data stops cleanup. */
export function sampleReferences(patches: Patch[], storage: StorageReader): Set<string> | null {
  const keep = pendingSampleIds();
  const collect = (value: unknown) => {
    if (!value || typeof value !== 'object') throw new Error('Unreadable rack');
    const rack = value as { version?: unknown; modules?: unknown };
    if (rack.version !== 2 || !Array.isArray(rack.modules)) throw new Error('Unreadable rack');
    for (const module of rack.modules) {
      if (!module || typeof module !== 'object') throw new Error('Unreadable module');
      const id = module.data?.assetId;
      if (typeof id === 'string' && id) keep.add(id);
    }
  };
  try {
    for (const patch of patches) collect(patch);
    for (const key of [STORAGE_KEY, `${STORAGE_KEY}:recovery`, TUTORIAL_KEY]) {
      const saved = storage.getItem(key);
      if (saved) collect(JSON.parse(saved));
    }
    return keep;
  } catch {
    return null;
  }
}

/**
 * Each open rack holds a shared Web Lock. Cleanup needs an exclusive lock,
 * so it never deletes another tab's live or undo assets. Without Web Locks
 * we conservatively retain samples. No time-based leases can expire while
 * a background tab is asleep.
 */
export function startSampleMaintenance(
  getPatches: () => Patch[],
  getStorage: () => StorageReader,
  locks: LockManager | undefined = typeof navigator !== 'undefined' ? navigator.locks : undefined,
) {
  let closed = false,
    busy = false;
  let release: (() => void) | undefined;
  let holding: Promise<unknown> = Promise.resolve();
  async function holdShared() {
    if (!locks || closed) return;
    let acquired!: () => void;
    const ready = new Promise<void>((resolve) => {
      acquired = resolve;
    });
    const lifetime = new Promise<void>((resolve) => {
      release = resolve;
    });
    holding = locks
      .request(SAMPLE_LOCK, { mode: 'shared' }, async () => {
        acquired();
        if (!closed) await lifetime;
      })
      .catch(() => {
        acquired();
      });
    await ready;
  }
  async function sweep() {
    if (!locks || busy || closed) return;
    busy = true;
    try {
      // Serialize upgrades: two tabs must never both release their shared
      // leases and mistake each other for a closed tab.
      await locks.request(`${SAMPLE_LOCK}:sweep`, { mode: 'exclusive' }, async () => {
        if (closed) return;
        release?.();
        await holding;
        try {
          await locks.request(
            SAMPLE_LOCK,
            { mode: 'exclusive', ifAvailable: true },
            async (lock) => {
              if (!lock || closed) return;
              const keep = sampleReferences(getPatches(), getStorage());
              if (keep) await pruneSamples(keep);
            },
          );
        } finally {
          await holdShared();
        }
      });
    } catch {
      // Maintenance must never prevent rack editing or saving.
    } finally {
      busy = false;
    }
  }
  // Callers wait for protection before reading the saved rack. This closes
  // the gap between another tab's cleanup and restoring a sample reference.
  const ready = holdShared();
  const timer = setInterval(() => {
    void sweep();
  }, 60_000);
  return {
    ready,
    sweep,
    close() {
      closed = true;
      clearInterval(timer);
      release?.();
    },
  };
}
