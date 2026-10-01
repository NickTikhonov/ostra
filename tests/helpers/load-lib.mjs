import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

export async function loadLib(names) {
  const dir = await mkdtemp(join(tmpdir(), 'modular-lib-tests-'));
  for (const name of names) {
    const source = await readFile(new URL(`../../src/lib/${name}.ts`, import.meta.url), 'utf8');
    const output = ts
      .transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
      })
      .outputText.replace(/from ['"]\.\/([^'"]+)['"]/g, "from './$1.mjs'")
      .replace(
        /['"]\.\.\/modules\/definitions.generated.js['"]/,
        JSON.stringify(new URL('../../src/modules/definitions.generated.js', import.meta.url).href),
      );
    await writeFile(join(dir, `${name}.mjs`), output);
  }
  return {
    load: (name) => import(pathToFileURL(join(dir, `${name}.mjs`)).href),
    close: () => rm(dir, { recursive: true, force: true }),
  };
}
