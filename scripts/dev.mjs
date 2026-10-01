import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { syncModules } from './sync-modules.mjs';
await syncModules();
let timer,
  syncing = false,
  pending = false;
async function sync() {
  if (syncing) {
    pending = true;
    return;
  }
  syncing = true;
  try {
    await syncModules();
  } catch (e) {
    console.error('[modules]', e.message);
  } finally {
    syncing = false;
    if (pending) {
      pending = false;
      void sync();
    }
  }
}
const watchers = ['src/modules', 'src/audio'].map((path) =>
  watch(path, { recursive: true }, (_event, file) => {
    if (file?.includes('.generated.')) return;
    clearTimeout(timer);
    timer = setTimeout(sync, 120);
  }),
);
const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', ...process.argv.slice(2)],
  { stdio: 'inherit' },
);
const stop = () => {
  clearTimeout(timer);
  for (const watcher of watchers) watcher.close();
  child.kill('SIGTERM');
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.on('exit', (code) => {
  for (const watcher of watchers) watcher.close();
  process.exit(code ?? 0);
});
