/**
 * Copy Production-only Vercel env vars to Preview (same values).
 * Uses local Vercel CLI auth token; does not write secrets to disk.
 *
 * Usage: node automation/ops/sync-vercel-preview-env.mjs
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const PROJECT_ID = 'prj_7BLQNtPb8iIdV5FShdY2Ln7n3sKR';
const TEAM_ID = 'team_dtnOuQcp1SAmHhXp5C93coWr';

function loadVercelToken() {
  const paths = [
    join(homedir(), '.vercel', 'auth.json'),
    join(process.env.APPDATA ?? '', 'com.vercel.cli', 'auth.json'),
    join(process.env.APPDATA ?? '', 'com.vercel.cli', 'Data', 'auth.json'),
    join(process.env.APPDATA ?? '', 'xdg.data', 'com.vercel.cli', 'auth.json'),
  ];
  for (const p of paths) {
    try {
      const parsed = JSON.parse(readFileSync(p, 'utf8'));
      if (parsed.token) return parsed.token;
    } catch {
      /* try next */
    }
  }
  throw new Error('Vercel CLI token not found. Run: npx vercel login');
}

const token = loadVercelToken();
const headers = { Authorization: `Bearer ${token}` };

const listUrl = `https://api.vercel.com/v9/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`;
const listRes = await fetch(listUrl, { headers });
if (!listRes.ok) {
  console.error('List env failed:', listRes.status, await listRes.text());
  process.exit(1);
}
const { envs } = await listRes.json();

const productionOnly = envs.filter(
  e => e.target?.includes('production') && !e.target?.includes('preview'),
);

if (!productionOnly.length) {
  console.log('No production-only env vars to sync.');
  process.exit(0);
}

let synced = 0;
for (const env of productionOnly) {
  const detailRes = await fetch(
    `https://api.vercel.com/v1/projects/${PROJECT_ID}/env/${env.id}?teamId=${TEAM_ID}`,
    { headers },
  );
  if (!detailRes.ok) continue;
  const detail = await detailRes.json();
  const body = {
    key: detail.key,
    value: detail.value,
    type: detail.type,
    target: ['preview'],
  };
  const createRes = await fetch(
    `https://api.vercel.com/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`,
    {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  if (createRes.ok) {
    synced++;
    console.log(`Preview: ${detail.key}`);
  } else if (createRes.status === 409) {
    console.log(`Preview already has: ${detail.key}`);
  } else {
    console.warn(`Skip ${detail.key}:`, createRes.status, await createRes.text());
  }
}

console.log(`Done. Added or attempted ${productionOnly.length} vars; ${synced} new preview entries.`);
