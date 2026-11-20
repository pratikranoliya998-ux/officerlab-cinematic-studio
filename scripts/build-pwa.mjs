import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const base = process.env.OFFICERLAB_BASE_PATH || '/';
if (!base.startsWith('/') || !base.endsWith('/')) {
  throw new Error('OFFICERLAB_BASE_PATH must start and end with /. Example: /officerlab-cinematic-studio/');
}

execFileSync(process.execPath, [resolve('node_modules/vite/bin/vite.js'), 'build', `--base=${base}`], {
  stdio: 'inherit'
});

const dist = resolve('dist');
const html = await readFile(resolve(dist, 'index.html'), 'utf8');
const references = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
  .map(match => match[1])
  .filter(value => !/^(https?:|\/\/|data:|#|mailto:)/i.test(value))
  .filter(value => /(^|\/)assets\//.test(value));

const assets = [...new Set(references.map(value => new URL(value, 'https://officerlab.invalid').pathname))];
if (assets.length === 0) {
  throw new Error('No built JavaScript/CSS assets were found in dist/index.html; refusing to create an incomplete offline cache.');
}

const workerPath = resolve(dist, 'sw.js');
let worker = await readFile(workerPath, 'utf8');
const marker = 'const BUILD_ASSETS = [];';
if (!worker.includes(marker)) {
  throw new Error('PWA service worker build marker is missing.');
}
worker = worker.replace(marker, `const BUILD_ASSETS = ${JSON.stringify(assets, null, 2)};`);
await writeFile(workerPath, worker, 'utf8');

console.log(`OfficerLab PWA: precached ${assets.length} built JavaScript/CSS asset(s) for base ${base}`);
