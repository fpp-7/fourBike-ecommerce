import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));

async function sourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes:true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(target));
    else if (/\.(mjs|js)$/.test(entry.name)) files.push(target);
  }
  return files;
}

const files = (await Promise.all(['public/js','scripts','tests'].map(folder => sourceFiles(path.join(root, folder))))).flat();
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding:'utf8', windowsHide:true });
  if (result.error || result.status !== 0) {
    process.stderr.write(result.stderr || String(result.error));
    process.exit(1);
  }
}
console.log(`Sintaxe verificada em ${files.length} arquivos JavaScript.`);
