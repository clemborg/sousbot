# Vercel deployment target for Sousbot

**Status: architecture decision / deployment checklist, not a deployed application.**  
**Decision:** Vercel hosts BOTH the React/Vite frontend and Node/Express API as independent Vercel projects sourced from the same `clemborg/sousbot` monorepo. Supabase hosts PostgreSQL and Auth.

## Why two projects?

```text
               GitHub: clemborg/sousbot
                           |
              +------------+------------+
              |                         |
     Vercel project: web         Vercel project: API
         apps/web                    apps/api
       React + Vite                Express function
              |                         |
              |     HTTPS/JSON API      |
              +------------------------>+
                                        |
                                     Supabase
                                PostgreSQL + Auth
```

This retains the user's chosen **React + TypeScript + Node + PostgreSQL/Supabase** stack. No Next.js migration is required. Vercel natively supports Vite for frontends and Express as a Function.

The public client builds with `VITE_API_BASE_URL=https://<API_PROJECT_HOST>`. It sends Supabase access tokens to Express for authenticated actions; user IDs are verified server-side. For now, the API permits the configured frontend origin with `WEB_ORIGIN`.

## One-time Vercel setup (after local DB smoke tests)

**Checklist:** For checkbox-by-checkbox steps (env vars, auth, privacy smoke), use [VERCEL_IMPORT_CHECKLIST.md](VERCEL_IMPORT_CHECKLIST.md).

1. Import GitHub repo `clemborg/sousbot` twice into Vercel:
   - **Web**: root directory `apps/web`, framework Vite, Node 22+, output directory `dist`.
   - **API**: root directory `apps/api`, framework Express/Other as autodetected, Node 22+; Vercel recognizes `src/index.ts`, where the app is exported as default. The local server listener is not invoked in Vercel.
2. Enable access to shared workspace code outside root directory if Vercel doesn't already include it. Ensure `packages/shared` builds before web/API builds (the shared package currently resolves its `dist/index.js` artifact); verify Vercel's build commands on the first preview rather than assuming npm workspaces compile automatically.
3. Configure **web** environment variables (Preview and Production):
   - `VITE_SUPABASE_URL` = Supabase project HTTPS URL.
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = Supabase publishable browser key.
   - `VITE_API_BASE_URL` = full HTTPS origin of deployed API project (do not include `/api/v1`).
4. Configure **API** environment variables (Preview and Production):
   - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` for verifying user access tokens.
   - `DATABASE_URL` = **Supabase shared transaction pooler** PostgreSQL URI (port 6543), with TLS (`sslmode=require`); **secret**.
   - `WEB_ORIGIN` = actual frontend origin allowed by Express CORS. For preview hostnames use explicitly approved origins; do not blindly allow every origin.
5. Configure Supabase Auth redirect allowlist for production and approved preview frontend URLs. Confirm email-login returns to the correct frontend host.
6. Test GET `/api/v1/health` on API host, GET `/api/v1/recipes` from frontend, login, a cooking-session POST, and revisit history under **two distinct users**. Check all unexpected anonymous requests fail to see private notes.
7. For nested React client routes, place a SPA fallback in `apps/web/vercel.json` when adding URL-based routing. No rewrite is required just for the current in-app local component view, but deep links will need it.
8. Attach a custom domain if desired. API and web can remain separate hostnames; a reverse proxy/same-origin rewrite is a possible later refinement.
9. Keep schema migrations as a separate reviewed operation and ingestion/auditing as scheduled GitHub Actions or another background worker. A Vercel Function is **not** a permanently running Node server or cron worker.

## Database connection on Functions

The `pg` connection pool is created once at module scope. A conventional always-on Node server may use several connections, but multiple warm Vercel Functions can scale concurrently. Therefore the code uses `max: 1` when `VERCEL` is present. Use Supabase transaction pooling for this runtime; node-postgres does not create named prepared statements by default, but do not add named prepared statements or session-persistent SQL when using transaction mode.

For database migrations (including `supabase/migrations/0001_foundation.sql`), use the Supabase SQL editor or a direct/session mode connection, NOT the function's runtime URL.

## Security requirements

- Never put `DATABASE_URL`, `sb_secret_*`, or service-role credentials in `VITE_*` variables or checked-in files.
- Supabase **publishable** keys are intended for client-side exposure, but database passwords and service-role keys are not.
- API must scope `user_books` and `cooking_sessions` to the Supabase-authenticated user. Database superuser-level connections may bypass RLS.
- Never cache personalized GET responses or user notes in public CDN caches.
- Set environment values separately for Preview and Production, and explicitly review how API CORS works for ephemeral preview URLs.

## Deployment risks still to validate

- Monorepo shared package resolution/build commands and Vercel's auto-detection of the Express entry point.
- Connecting to Supabase with SSL transaction pooling and scaling under multiple concurrent Functions.
- Preview URL + Supabase OAuth/email redirect configuration.
- API requests across two Vercel project origins (CORS), versus optional same-origin rewrite.
- Persistent cookbook data not yet migrated from Clemport; Vercel deployment alone will have an empty catalog.

## References (official)

- Vercel Express: https://vercel.com/docs/frameworks/backend/express
- Vercel Vite: https://vercel.com/docs/frameworks/frontend/vite
- Vercel monorepos: https://vercel.com/docs/monorepos
- Supabase Postgres connections: https://supabase.com/docs/guides/database/connecting-to-postgres
