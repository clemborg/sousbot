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

Open Supabase Dashboard → **SQL Editor** and execute `supabase/migrations/0001_foundation.sql` exactly once. This is intentionally a reviewed manual migration, not a background task. It creates catalog, cookbook and per-user cooking-history tables, indexes, constraints and RLS policies.

IMPORTANT: The SQL is **not applied** by the act of committing it to GitHub. Run it on the intended, empty Sousbot project. Future schema changes should be migrations, not edits applied directly to this baseline.

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

## 5. Empty database is expected initially

No recipe JSON files have been migrated to Sousbot or imported into Supabase as of the initial scaffold. The Discover screen will display an empty-state message until a tested importer publishes records. There is **no automatic publication** of unaudited recipes.

## Operational/security notes

- Browser exposes only the publishable key; never put database connection URL/secret keys in `VITE_*` variables.
- The Node service holds the database URL and uses a privileged connection. It validates JWTs against Supabase Auth and scopes all personal data queries by verified user ID.
- The catalog is not directly exposed via PostgREST: new catalog tables have RLS enabled without public policies. The Express REST API provides the public recipe reads.
- Keep public repo source code free of real connection strings and secrets; configure them in your deployment provider when chosen.
