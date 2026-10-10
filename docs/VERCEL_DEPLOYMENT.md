# Vercel deployment target for Sousbot

**Stack:** One Next.js 15 project rooted at `apps/web` — React UI (App Router) and `/api/v1/*` Route Handlers on the same origin. Supabase hosts PostgreSQL and Auth.

## Architecture

```text
               GitHub: clemborg/sousbot
                           |
              Vercel project (root: apps/web)
              +---------------------------+
              |  Next.js pages + static   |
              |  Route Handlers /api/v1   |
              +---------------------------+
                           |
                        Supabase
                   PostgreSQL + Auth
```

Monorepo install/build is defined in [`apps/web/vercel.json`](../apps/web/vercel.json): install at repo root, build `@sousbot/shared` then `@sousbot/web`.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser Supabase client |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser Supabase client |
| `SUPABASE_URL` | API JWT verification |
| `SUPABASE_PUBLISHABLE_KEY` | API JWT verification |
| `DATABASE_URL` | Supabase **transaction pooler** port **6543**, TLS (`sslmode=require`); **secret** |
| `WEB_ORIGIN` | Optional; defaults to `https://$VERCEL_URL` |

## Local dev

```bash
npm install
cp apps/web/.env.example apps/web/.env   # fill DATABASE_URL + Supabase keys
npm run dev                                 # http://localhost:3000
```

Apply migrations from `supabase/migrations/` via Supabase dashboard or CLI before seeding (`npm run db:seed`).

## Smoke tests after deploy

- `GET /api/v1/health` → 200, `database: connected`
- `GET /` → HTML (no function error page)
- Hard refresh `/recipes?q=miso` → 200
- Magic link sign-in with Site URL = production Vercel URL
