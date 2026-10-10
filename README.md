# Sousbot

Ingredient-first recipe discovery with a shared catalog and private, dated cooking notes.

## Repository structure

```text
apps/web               — Next.js UI + /api/v1 Route Handlers
packages/shared        — Zod DTOs shared by web and API
supabase/migrations    — reviewed SQL (apply via Supabase)
recipes/               — canonical recipe JSON (fixtures + future bulk archive)
automation/ingestion/  — import-recipes.ts CLI
audit/, ingestion/     — audit ledgers and import run logs
docs/                  — product and engineering specification
```

See [architecture](docs/ARCHITECTURE.md) and [Vercel deployment](docs/VERCEL_DEPLOYMENT.md).

## Local quick start

1. [Supabase setup](docs/SUPABASE_SETUP.md) — `apps/web/.env`, apply migrations `0001` + `0002`
2. `npm install` && `npm run db:seed` — publish fixture recipes
3. `npm run dev` — http://localhost:3000 (UI + API)

## Deploy

One Vercel project: **root directory `apps/web`**. See [Vercel import checklist](docs/VERCEL_IMPORT_CHECKLIST.md).
