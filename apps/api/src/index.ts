import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

function resolveApiBundlePath(): string {
  const candidates = [
    join(process.cwd(), 'dist', 'index.cjs'),
    join(process.cwd(), 'apps', 'api', 'dist', 'index.cjs'),
    join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'index.cjs'),
  ];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  throw new Error(`API bundle missing (expected dist/index.cjs). Checked: ${candidates.join(', ')}`);
}

const createApp = require(resolveApiBundlePath()).default as () => import('express').Express;

export default createApp();
