# Sousbot

Ingredient-first recipe discovery with a shared catalog and private, dated cooking notes.

## Repository structure

```text
apps/web, apps/api     — React + Express application
packages/shared        — Zod DTOs shared by web and API
supabase/migrations    — reviewed SQL (apply manually)
recipes/               — canonical recipe JSON (fixtures + future bulk archive)
automation/ingestion/  — import-recipes.ts CLI
audit/, ingestion/     — audit ledgers and import run logs
docs/                  — product and engineering specification
```

See [architecture](docs/ARCHITECTURE.md) for trust boundaries and [data operations](docs/DATA_OPERATIONS.md) for import policy.

## Local quick start

1. [Supabase setup](docs/SUPABASE_SETUP.md) — env files, apply migrations `0001` + `0002`
2. `npm install` && `npm run db:seed` — publish three fixture recipes
3. `npm run dev` — web on :5173, API on :4000

## Deploy

[Vercel import checklist](docs/VERCEL_IMPORT_CHECKLIST.md) (two projects: `apps/web`, `apps/api`).

## Application foundation (2026-10-09)

Monorepo with React/TypeScript, Node/Express API, and PostgreSQL on Supabase. See **[Product and engineering specification](docs/README.md)** and [implementation status](docs/IMPLEMENTATION_STATUS.md).
