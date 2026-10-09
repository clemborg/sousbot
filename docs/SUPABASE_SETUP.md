# Supabase connection / first local run

Supabase project: `https://kkdswyfeznxrntungivm.supabase.co`.

The user supplied a `sb_publishable_` client key. A publishable key is **not** a Postgres connection credential and does not permit running SQL migrations. We intentionally don't commit the actual key in the public repo; set it in local env files (or hosting env variables). Never paste or commit a Supabase `service_role` / `sb_secret_` key or database password into git.

## 1. Create local environment files (Windows PowerShell)

```powershell
Copy-Item apps/web/.env.example apps/web/.env
Copy-Item apps/api/.env.example apps/api/.env
```

Edit both copies:
- Web: `VITE_SUPABASE_URL` already points to this project; set `VITE_SUPABASE_PUBLISHABLE_KEY` to your Supabase **publishable** key.
- API: `SUPABASE_URL` same project; set `SUPABASE_PUBLISHABLE_KEY` to same publishable key (used for session verification).
- API: set `DATABASE_URL` to the **PostgreSQL connection string** from Supabase Dashboard **Connect**. It includes a DB username and password, which must remain secret. If the direct host doesn't work on your connection, choose Supabase's session pooler. The example URL is a placeholder.
- API: keep `WEB_ORIGIN=http://localhost:5173`.

## 2. Apply schema

Open Supabase Dashboard → **SQL Editor** and execute, in order:

1. `supabase/migrations/0001_foundation.sql`
2. `supabase/migrations/0002_recipe_provenance.sql`

Each file is a reviewed manual migration, not a background task. Together they create catalog tables, personal history, RLS policies, and import provenance tracking.

IMPORTANT: The SQL is **not applied** by the act of committing it to GitHub. Run it on the intended Sousbot project. Use a **direct/session** connection string from Supabase Connect for migrations and for local `DATABASE_URL` during development seeding.

## 2b. Seed dev catalog (optional)

After `apps/api/.env` has a working `DATABASE_URL`:

```bash
npm run db:seed
```

This imports and **publishes** the three fixture recipes under `recipes/fixtures/` via [automation/ingestion/import-recipes.ts](../automation/ingestion/import-recipes.ts). Re-running is safe (SHA-based skip).

Other commands:

```bash
npm run import:recipes -- --dir recipes/fixtures    # dry-run validate
npm run import:recipes:publish -- --dir recipes     # bulk publish (use with care)
```

## 3. Set up Supabase Auth redirects

In Dashboard → Authentication → URL Configuration, configure local Site URL `http://localhost:5173` and add `http://localhost:5173/**` to allowed redirect URLs. Ensure Email OTP/magic-link sign-in is enabled.

## 4. Install and run

Prerequisites: Node.js 22+, npm, access to the Supabase project.

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`. Web uses a Vite proxy for `/api` to the Node API at `http://localhost:4000`.

Run `npm run build` and `npm run typecheck` before deployment.

Verify API health: `http://localhost:4000/api/v1/health` should return `{"status":"ok","database":"connected"}` only after the API environment and database migration are correct.

## 5. Empty database until you seed or import

Until you run `npm run db:seed` or `npm run import:recipes:publish`, Discover shows an empty catalog. There is **no automatic publication** of unaudited recipes; `--publish` requires an explicit CLI flag and passes a minimal source+ingredient gate.

## Operational/security notes

- Browser exposes only the publishable key; never put database connection URL/secret keys in `VITE_*` variables.
- The Node service holds the database URL and uses a privileged connection. It validates JWTs against Supabase Auth and scopes all personal data queries by verified user ID.
- The catalog is not directly exposed via PostgREST: new catalog tables have RLS enabled without public policies. The Express REST API provides the public recipe reads.
- Keep public repo source code free of real connection strings and secrets; configure them in your deployment provider when chosen.

## Future hosting target: Vercel

Sousbot is intended for **Vercel**, with `apps/web` and `apps/api` as separate Vercel projects linked to the same GitHub monorepo. See [Vercel deployment plan](VERCEL_DEPLOYMENT.md) and the step-by-step [Vercel import checklist](VERCEL_IMPORT_CHECKLIST.md).

For the Express API **on Vercel**, obtain the **Supabase transaction-pooler (port 6543)** connection string, not the direct host or the session pooler. Use TLS (`sslmode=require` in the connection string), a small client pool (1 per function instance), and no named prepared statements. Use a direct/session-capable connection for database migrations. Keep all connection strings out of the web bundle.
