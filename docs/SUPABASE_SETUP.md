# Supabase connection / first local run

Supabase project: `https://kkdswyfeznxrntungivm.supabase.co`.

The user supplied a `sb_publishable_` client key. A publishable key is **not** a Postgres connection credential and does not permit running SQL migrations. We intentionally don't commit the actual key in the public repo; set it in local env files (or hosting env variables). Never paste or commit a Supabase `service_role` / `sb_secret_` key or database password into git.

## 1. Create local environment file (Windows PowerShell)

```powershell
Copy-Item apps/web/.env.example apps/web/.env
```

Edit `apps/web/.env`:

- `NEXT_PUBLIC_SUPABASE_URL` — project URL above.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase **publishable** key (browser).
- `SUPABASE_URL` — same project URL (API routes verify JWTs).
- `SUPABASE_PUBLISHABLE_KEY` — same publishable key.
- `DATABASE_URL` — **PostgreSQL connection string** from Supabase Dashboard **Connect**. Prefer **direct** or **session pooler** for local `npm run db:seed` / migrations. Vercel production should use the **transaction pooler (port 6543)** with TLS. The example in `.env.example` is a placeholder.

Optional: `WEB_ORIGIN=http://localhost:3000` when testing CORS against a custom origin.

## 2. Apply schema

Open Supabase Dashboard → **SQL Editor** and execute, in order:

1. `supabase/migrations/0001_foundation.sql`
2. `supabase/migrations/0002_recipe_provenance.sql`

Each file is a reviewed manual migration, not a background task. Together they create catalog tables, personal history, RLS policies, and import provenance tracking.

IMPORTANT: The SQL is **not applied** by the act of committing it to GitHub. Run it on the intended Sousbot project. Use a **direct/session** connection string from Supabase Connect for migrations and for local `DATABASE_URL` during development seeding.

## 2b. Seed dev catalog (optional)

After `apps/web/.env` has a working `DATABASE_URL`:

```bash
npm run db:seed
```

This **publishes** the three fixture recipes under `recipes/fixtures/` and upserts the pilot book catalog in `books/fixtures/pilot-catalog.json` via the ingestion scripts. Re-running is safe (recipes skip on unchanged SHA; books skip on existing slug).

Other commands:

```bash
npm run import:recipes -- --dir recipes/fixtures    # dry-run validate
npm run import:recipes:publish -- --dir recipes     # bulk publish (use with care)
npm run import:books                                # dry-run book catalog
npm run db:seed:books                               # books only
```

## 3. Set up Supabase Auth redirects

In Dashboard → Authentication → URL Configuration:

- **Local:** Site URL `http://localhost:3000`, redirect allowlist `http://localhost:3000/**`.
- **Production:** Site URL `https://sousbot.vercel.app` (or your custom domain), plus that origin in redirect URLs. Add preview URLs only if you test magic links on Vercel previews (e.g. specific preview URLs or a controlled pattern).

Ensure Email OTP / magic-link sign-in is enabled.

## 4. Install and run

Prerequisites: Node.js 22+, npm, access to the Supabase project.

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`. The Next.js app serves UI and `/api/v1/*` on the same origin.

Run `npm run build` and `npm run typecheck` before deployment.

Verify health: `http://localhost:3000/api/v1/health` should return `{"status":"ok","database":"connected"}` only after env and migrations are correct.

## 5. Empty database until you seed or import

Until you run `npm run db:seed` or `npm run import:recipes:publish`, Discover shows an empty catalog. There is **no automatic publication** of unaudited recipes; `--publish` requires an explicit CLI flag and passes a minimal source+ingredient gate.

## Operational/security notes

- Browser exposes only `NEXT_PUBLIC_*` publishable keys; never put database connection URLs or secret keys in `NEXT_PUBLIC_*` variables.
- API routes hold the database URL and use a privileged connection. They validate JWTs against Supabase Auth and scope all personal data queries by verified user ID.
- The catalog is not directly exposed via PostgREST: catalog tables have RLS enabled without public policies. The Next.js API provides public reads for published recipes only.
- Keep public repo source code free of real connection strings and secrets; configure them in Vercel (Production + Preview) when deploying.

## Hosting: Vercel (Next.js)

Production uses a **single Vercel project** rooted at `apps/web` (Next.js App Router + Route Handlers under `/api/v1`). See [Vercel deployment plan](VERCEL_DEPLOYMENT.md) and [Vercel import checklist](VERCEL_IMPORT_CHECKLIST.md).

For **Vercel Functions → Postgres**, use the Supabase **transaction pooler (port 6543)** connection string (`POSTGRES_URL` or `DATABASE_URL`), TLS (`sslmode=require`), and a small client pool. Use direct/session-capable URLs for migrations and local `--apply` imports. Keep all connection strings out of the client bundle.
