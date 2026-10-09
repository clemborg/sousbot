# Vercel import checklist (owner runbook)

Use this after local Supabase migrations and a successful `npm run db:seed` (or production import). Maps to GitHub issues [#1](https://github.com/clemborg/sousbot/issues/1)–[#3](https://github.com/clemborg/sousbot/issues/3) and D0–D4 in [VERCEL_RELEASE_SCOPE.md](VERCEL_RELEASE_SCOPE.md).

**Creating Vercel projects requires your dashboard login** — commits do not auto-create projects.

## Prerequisites

- [ ] Node.js 22+ locally; `npm run typecheck` and `npm run build` pass on `main`.
- [ ] Supabase: `0001_foundation.sql` and `0002_recipe_provenance.sql` applied on the target project.
- [ ] Catalog seeded or imported (`npm run db:seed` for dev fixtures, or `npm run import:recipes:publish` for `recipes/`).
- [ ] GitHub repo `clemborg/sousbot` accessible to your Vercel team/account.

## D1 — Project A: `sousbot-web`

- [ ] Vercel → **Add New Project** → import `clemborg/sousbot`.
- [ ] **Root Directory:** `apps/web` (Framework: Vite).
- [ ] Confirm install/build match [apps/web/vercel.json](../apps/web/vercel.json) (monorepo root install + shared package build).
- [ ] **Environment variables** (Preview + Production as appropriate):
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_PUBLISHABLE_KEY`
  - [ ] `VITE_API_BASE_URL` → full HTTPS origin of API project (no `/api/v1` suffix)
- [ ] Deploy preview; open site root loads React shell.
- [ ] Hard refresh on `/` (SPA rewrite in `vercel.json`) — not a Vercel 404.

## D1 — Project B: `sousbot-api`

- [ ] Second Vercel project, same repo, **Root Directory:** `apps/api`.
- [ ] Confirm [apps/api/vercel.json](../apps/api/vercel.json) monorepo build commands.
- [ ] **Environment variables** (secrets in Vercel only):
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_PUBLISHABLE_KEY`
  - [ ] `DATABASE_URL` → Supabase **transaction pooler** port **6543**, TLS (`sslmode=require`)
  - [ ] `WEB_ORIGIN` → exact web origin (production URL; add preview URL when testing previews)
- [ ] `GET https://<api-host>/api/v1/health` → `{"status":"ok","database":"connected"}`.
- [ ] Missing/invalid `DATABASE_URL` fails closed (no stack traces or secrets in response).

## Cross-project wiring

- [ ] From browser on web URL: network requests hit `VITE_API_BASE_URL` (not localhost).
- [ ] CORS: API allows only `WEB_ORIGIN`; no `*` on authenticated routes.
- [ ] Anonymous `GET /api/v1/recipes?q=miso` returns published fixtures after seed.

## D2 — Auth (Supabase)

- [ ] Dashboard → Authentication → URL Configuration: Site URL = production web URL.
- [ ] Redirect allowlist includes production web URL and each **approved** preview web URL.
- [ ] Magic link: sign in from web → email → lands back on same host; session persists on reload.

## D3 — Privacy smoke (manual)

- [ ] User A: search → recipe → add dated cooking note → reload → note visible.
- [ ] User B: same recipe — cannot see/edit/delete A’s notes or shelf.
- [ ] Anonymous: can browse published catalog; cannot read personal notes.

## D4 — Release gate

- [ ] CI green on deployed commit.
- [ ] Preview vs production env vars documented; avoid preview writes to production user data without intent.
- [ ] Rollback: redeploy previous Vercel deployment; do **not** run SQL migrations from Functions.
- [ ] One pilot user completes search → recipe → note without developer help.

## References

- Env matrix: [VERCEL_RELEASE_SCOPE.md](VERCEL_RELEASE_SCOPE.md)
- Architecture: [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)
- Local DB + seed: [SUPABASE_SETUP.md](SUPABASE_SETUP.md)
