import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'apps/web/dist');
const publicDir = join(root, 'apps/api/public');

if (!existsSync(distDir)) {
  console.error('sync-web-to-api-public: apps/web/dist missing — run web build first');
  process.exit(1);
}

mkdirSync(publicDir, { recursive: true });

for (const entry of readdirSync(publicDir, { withFileTypes: true })) {
  if (entry.name === '.gitkeep') continue;
  const path = join(publicDir, entry.name);
  rmSync(path, { recursive: true, force: true });
}

cpSync(distDir, publicDir, { recursive: true });

const indexPath = join(publicDir, 'index.html');
if (!existsSync(indexPath)) {
  console.error('sync-web-to-api-public: index.html missing after copy');
  process.exit(1);
}

const entries = readdirSync(publicDir);
console.log(
  `sync-web-to-api-public: copied apps/web/dist → apps/api/public (${entries.length} entries)`,
);
