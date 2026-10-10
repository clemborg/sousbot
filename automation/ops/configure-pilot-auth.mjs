/**
 * PATCH Supabase Auth URL config for production + local pilot.
 * Requires SUPABASE_ACCESS_TOKEN (Personal Access Token with auth_config_write).
 *
 * Usage: SUPABASE_ACCESS_TOKEN=... node automation/ops/configure-pilot-auth.mjs
 */
const PROJECT_REF = 'kkdswyfeznxrntungivm';
const SITE_URL = 'https://sousbot.vercel.app';
const URI_ALLOW_LIST = [
  'https://sousbot.vercel.app/**',
  'http://localhost:3000/**',
  'https://*-clemborgs-projects.vercel.app/**',
].join(',');

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('Set SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens)');
  process.exit(1);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    site_url: SITE_URL,
    uri_allow_list: URI_ALLOW_LIST,
  }),
});

if (!res.ok) {
  console.error('Auth config update failed:', res.status, await res.text());
  process.exit(1);
}

console.log('Supabase Auth updated: site_url + uri_allow_list');
