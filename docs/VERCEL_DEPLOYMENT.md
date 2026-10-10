# Vercel deployment target for Sousbot

**Status: architecture decision / deployment checklist, not a deployed application.**  
**Decision:** One Vercel project rooted at `apps/api` hosts the React/Vite UI (static assets in `public/`) and the Express API (`/api/v1/*`) on the same origin. Supabase hosts PostgreSQL and Auth.

## Why one project?

```text
               GitHub: clemborg/sousbot
                           |
              Vercel project (root: apps/api)
              +---------------------------+
              |  public/  → Vite dist CDN |
              |  Express  → /api/v1/*     |
              +---------------------------+
                           |
                        Supabase
                   PostgreSQL + Auth
```

This keeps **React + TypeScript + Node + PostgreSQL/Supabase** without Next.js. The Vite build is copied to [`apps/api/public/`](../apps/api/public/) during deploy ([`scripts/sync-web-to-api-public.mjs`](../scripts/sync-web-to-api-public.mjs)). Vercel serves `public/**` on the CDN; Express handles API routes ([Express on Vercel](https://vercel.com/docs/frameworks/backend/express) — do not rely on `express.static()` on Vercel).

The browser calls `/api/v1/...` on the same host when `VITE_API_BASE_URL` is unset. Supabase access tokens are sent to Express for authenticated actions; user IDs are verified server-side. CORS uses `WEB_ORIGIN`, defaulting to `https://$VERCEL_URL` when unset on Vercel.

## One-time Vercel setup (after local DB smoke tests)

**Checklist:** For checkbox-by-checkbox steps (env vars, auth, privacy smoke), use [VERCEL_IMPORT_CHECKLIST.md](VERCEL_IMPORT_CHECKLIST.md).

1. Import GitHub repo `clemborg/sousbot` **once**:
   - **Root Directory:** `apps/api` (Framework: Express), Node 22+.
   - Vercel recognizes `index.ts` (re-exports the bundled app in `dist/`); local dev uses `src/dev.ts` with `listen()`.
   - Install/build commands live in [`apps/api/vercel.json`](../apps/api/vercel.json): monorepo root install, build `@sousbot/shared`, `@sousbot/web`, `@sousbot/api`, then sync web `dist` → `public/`.
2. **Environment variables** on the single project (Preview and Production as appropriate):

   | Variable | Purpose |
   |----------|---------|
   | `VITE_SUPABASE_URL` | Embedded at **web** build time |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Embedded at web build time |
   | `VITE_API_BASE_URL` | **Leave empty / omit** (same-origin) |
   | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | API JWT verification |
   | `DATABASE_URL` | Supabase **transaction pooler** port **6543**, TLS (`sslmode=require`); **secret** |
   | `WEB_ORIGIN` | Optional; defaults to `https://$VERCEL_URL`. Set for a **custom domain**. |

3. Configure Supabase Auth: Site URL = your Vercel deployment URL; redirect allowlist includes production (and preview URLs if testing magic links on previews).
4. Smoke tests: `GET /api/v1/health`, load `/`, hard refresh `/` (SPA rewrite in `vercel.json`), browse recipes, login, cooking-session POST under two users.
5. Attach a custom domain if desired (set `WEB_ORIGIN` to match).
6. Keep schema migrations as a separate reviewed operation; ingestion stays in GitHub Actions or another worker, not a long-lived Vercel process.

## Local and `vercel dev`

- **Day-to-day dev:** `npm run dev` — Vite on :5173 with `/api` proxied to :4000.
- **Production-like check:** From repo root, `npm run build` (includes sync to `apps/api/public/`). Then `cd apps/api && npx vercel dev` (Vercel CLI ≥ 47.0.5): confirm `/` serves the UI and `GET /api/v1/health` succeeds with local env vars.

## Database connection on Functions

The `pg` pool uses `max: 1` when `VERCEL` is set. Use Supabase transaction pooling; avoid named prepared statements in transaction mode.

For migrations (`supabase/migrations/*.sql`), use the Supabase SQL editor or a session/direct connection, not the function runtime URL.

## Security requirements

- Never put `DATABASE_URL`, `sb_secret_*`, or service-role credentials in `VITE_*` variables or checked-in files.
- API must scope private data to the Supabase-authenticated user.
- Never cache personalized GET responses in public CDN caches.
- Set Preview vs Production env vars deliberately; preview should not mutate production user data without intent.

## Deployment risks still to validate

- Monorepo build + sync on first Vercel preview.
- Supabase SSL transaction pooling under concurrent Functions.
- Preview URL + Supabase email redirect configuration.
- Empty catalog until recipes are imported/seeded on the target DB.

## References (official)

- Vercel Express: https://vercel.com/docs/frameworks/backend/express
- Vercel monorepos: https://vercel.com/docs/monorepos
- Supabase Postgres connections: https://supabase.com/docs/guides/database/connecting-to-postgres
