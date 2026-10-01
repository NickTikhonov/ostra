import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const notices = [];
const licenseFile = /^(licen[sc]e|copying|notice)(\.|$)/i;
async function collect(directory, recursive = false) {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const path = join(directory, entry.name);
    if (entry.isFile() && licenseFile.test(entry.name)) {
      notices.push(
        `\n${'='.repeat(72)}\n${path}\n${'='.repeat(72)}\n\n${await readFile(path, 'utf8')}`,
      );
    } else if (recursive && entry.isDirectory()) await collect(path, true);
  }
}
for (const [path, info] of Object.entries(lock.packages).sort(([a], [b]) => a.localeCompare(b))) {
  if (!path || info.dev) continue;
  try {
    await readdir(path);
  } catch {
    continue;
  } // Other-platform optional packages.
  notices.push(
    `\n${path.replace(/^node_modules\//, '')} ${info.version} — ${info.license ?? 'See package license'}`,
  );
  await collect(path);
}
// Next embeds additional libraries in its client/server runtime distribution.
await collect('node_modules/next/dist/compiled', true);
await writeFile(
  'public/THIRD_PARTY_NOTICES.txt',
  'Third-party software notices\n\nGenerated from the installed lockfile dependencies by npm run notices.\nThis includes build-time and optional native dependencies; not every listed\ncomponent is part of the static browser app. Original notices follow unchanged.\n' +
    notices.join('\n') +
    '\n',
);
console.log('Updated public/THIRD_PARTY_NOTICES.txt');
