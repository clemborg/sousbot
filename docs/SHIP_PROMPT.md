# Ship prompt — finish pilot gates (owner / next session)

Copy this block into a new Cursor chat when you want the agent to close the remaining **production pilot** gates. Do **not** start from the old Express/`apps/api` docs; production is **Next.js** at `apps/web` → [sousbot.vercel.app](https://sousbot.vercel.app).

---

## Context (already done)

- Vercel project `sousbot`, root `apps/web`, health OK, 3 published fixture recipes, 12 pilot books, 1 `pilot:shelf-qa` recipe–book link (miso ↔ *Japanese Home Cooking*).
- Repo: book importer (`npm run db:seed`, `import-books.ts`), magic-link redirect to `/auth/callback`, ops scripts in `automation/ops/`.
- **Blocked on last push:** CI build failed on `/auth/callback` missing Suspense — fix is in `AuthCallbackClient.tsx` + wrapper `page.tsx` (commit if not on `main` yet).

## Your job (in order)

### 1. Green deploy

- Confirm `main` CI (`Web and API typecheck`) is green after the auth Suspense fix.
- Confirm Vercel production deployment matches latest green `main`.

### 2. Supabase Auth URLs (required for journal + shelf)

Either dashboard **Authentication → URL configuration**:

- **Site URL:** `https://sousbot.vercel.app`
- **Redirect URLs:** `https://sousbot.vercel.app/**`, `http://localhost:3000/**`, optional `https://*-clemborgs-projects.vercel.app/**`

Or CLI (needs [personal access token](https://supabase.com/dashboard/account/tokens) with `auth_config_write`):

```powershell
$env:SUPABASE_ACCESS_TOKEN = "<token>"
npm run ops:configure-pilot-auth
```

### 3. Vercel Preview env (if you test magic links on previews)

```powershell
npm run ops:sync-vercel-preview-env
```

Then in Vercel → Project → Environment Variables: for **encrypted** vars (`POSTGRES_URL`, `POSTGRES_PASSWORD`, JWT/service secrets), check **Preview** (API cannot clone secret values). Re-use Production values or a separate preview database by policy.

### 4. Manual D3 privacy smoke (two real emails)

On **production**, after step 2:

1. User A: sign in → open a recipe → add cooking note → reload → note visible.
2. User B: same recipe → must not see/edit/delete A’s notes; shelf isolated.
3. Anonymous: `GET /api/v1/recipes/simple-miso-soup/cooking-sessions` → **401** (already expected).

Optional: A adds *Japanese Home Cooking* to shelf → Discover → **My cookbooks only** + `miso` → should include Simple Miso Soup (needs deployed search change from `f30705d`).

### 5. Local DB URL (optional, for re-seed / import)

Set `DATABASE_URL` in `apps/web/.env` to Supabase **direct/session** Connect string (not placeholder `HOST`). Then:

```powershell
npm run db:seed
```

### 6. Do not merge unrelated WIP

If `git stash list` shows `local-wip`, inspect before applying — it may contain half-finished discover filters/ranking. Prefer a clean branch for that work.

## Out of scope for “Mom + 2–5 users” (later)

- Bulk legacy JSON import (155 inventory), `0003+` migrations if still WIP in stash.
- Automated two-user API tests in CI.
- Full discover filters, pagination, ingredient aliases (see `docs/IMPLEMENTATION_STATUS.md`).

## Success criteria

- Magic link completes on `sousbot.vercel.app`, session survives reload.
- Two humans confirm private notes + shelf.
- CI green on `main`; no secrets in client bundle.

---
