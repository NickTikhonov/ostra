import type { AudioAsset } from '@/modules/types';

export type StoredSample = AudioAsset & {
  id: string;
  name: string;
  duration: number;
  peaks: number[];
};
const DB = 'modular-workshop:samples:v1';
const STORE = 'samples';
export const SAMPLE_LOCK = 'modular-workshop:sample-maintenance';
const pendingImports = new Set<string>();
export function pendingSampleIds() {
  return new Set(pendingImports);
}
export function releaseImportedSample(id: string) {
  pendingImports.delete(id);
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Local sample storage is unavailable.'));
    request.onblocked = () => reject(new Error('Close other rack tabs, then try importing again.'));
  });
}
export async function getSample(id: string): Promise<StoredSample | null> {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly'),
        request = tx.objectStore(STORE).get(id);
      tx.oncomplete = () => resolve(request.result ?? null);
      tx.onerror = () => reject(new Error('Could not read the saved sample.'));
      tx.onabort = () => reject(new Error('Reading the saved sample was interrupted.'));
    });
  } finally {
    db.close();
  }
}
async function saveSample(sample: StoredSample) {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(sample);
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(new Error('Sample could not be saved. Device storage may be full.'));
      tx.onabort = () =>
        reject(new Error('Sample could not be saved. Device storage may be full.'));
    });
  } finally {
    db.close();
  }
}
/** Decode offline: importing a file never opens a speaker connection or starts transport. */
export async function importSample(file: File): Promise<StoredSample> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  return locks
    ? locks.request(SAMPLE_LOCK, { mode: 'shared' }, () => decodeAndSave(file))
    : decodeAndSave(file);
}
async function decodeAndSave(file: File): Promise<StoredSample> {
  if (!/\.(wav|mp3)$/i.test(file.name)) throw new Error('Choose a WAV or MP3 file.');
  if (file.size > 25 * 1024 * 1024) throw new Error('Choose a file smaller than 25 MB.');
  const decoder = new OfflineAudioContext(2, 1, 48000);
  let decoded: AudioBuffer;
  try {
    decoded = await decoder.decodeAudioData(await file.arrayBuffer());
  } catch {
    throw new Error('This file could not be decoded. Try a PCM WAV or another MP3.');
  }
  if (decoded.duration > 120) throw new Error('Choose a sample up to 2 minutes long.');
  if (decoded.length < 2) throw new Error('This sample is empty.');
  const channels = [decoded.getChannelData(0).slice()];
  if (decoded.numberOfChannels > 1) channels.push(decoded.getChannelData(1).slice());
  for (const channel of channels)
    for (let n = 0; n < channel.length; n++) if (!Number.isFinite(channel[n])) channel[n] = 0;
  const peaks = Array.from({ length: 96 }, (_, n) => {
    const from = Math.floor((n * decoded.length) / 96),
      to = Math.floor(((n + 1) * decoded.length) / 96);
    let peak = 0;
    for (let i = from; i < to; i++)
      for (const channel of channels) peak = Math.max(peak, Math.abs(channel[i]));
    return Math.min(1, peak);
  });
  const sample: StoredSample = {
    id: crypto.randomUUID(),
    name: file.name,
    sampleRate: decoded.sampleRate,
    channels,
    duration: decoded.duration,
    peaks,
  };
  pendingImports.add(sample.id);
  try {
    await saveSample(sample);
    return sample;
  } catch (error) {
    pendingImports.delete(sample.id);
    throw error;
  }
}

/** Caller holds the exclusive maintenance lock; key cursors avoid loading PCM. */
export async function pruneSamples(keep: ReadonlySet<string>): Promise<number> {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE),
        request = store.openKeyCursor();
      let deleted = 0;
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        if (
          !keep.has(String(cursor.primaryKey)) &&
          !pendingImports.has(String(cursor.primaryKey))
        ) {
          store.delete(cursor.primaryKey);
          deleted++;
        }
        cursor.continue();
      };
      tx.oncomplete = () => resolve(deleted);
      tx.onerror = () => reject(new Error('Sample cleanup failed.'));
      tx.onabort = () => reject(new Error('Sample cleanup interrupted.'));
    });
  } finally {
    db.close();
  }
}
