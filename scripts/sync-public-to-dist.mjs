import { cpSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'apps/api/public');
const distPublic = join(root, 'apps/api/dist/public');

if (!existsSync(join(publicDir, 'index.html'))) {
  console.error('sync-public-to-dist: apps/api/public/index.html missing — run web sync first');
  process.exit(1);
}

cpSync(publicDir, distPublic, { recursive: true });
console.log('sync-public-to-dist: copied apps/api/public → apps/api/dist/public');
