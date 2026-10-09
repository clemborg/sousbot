# Foundation implementation status (2026-10-09)

## Committed scaffold (not deployed)

- npm workspaces: `apps/web`, `apps/api`, `packages/shared`.
- React 19 + Vite + TypeScript web; Node/Express + TypeScript API split into routes/middleware/services.
- Shared Zod contracts (`searchSchema` includes `myBooksOnly`); runtime validation on API inputs.
- Supabase URL in env examples; publishable key and `DATABASE_URL` must be supplied locally or on Vercel.
- Supabase Auth magic-link UI, session handling, auth-intent preservation across sign-in.
- PostgreSQL/Drizzle schema + migrations `0001_foundation.sql` and `0002_recipe_provenance.sql` (**not executed** against Supabase until you apply them).
- JSON importer: `automation/ingestion/import-recipes.ts`; npm scripts `import:recipes*`, `db:seed`; fixtures in `recipes/fixtures/`.
- Public catalog + personal endpoints: search (with optional my-books filter), recipe detail, books shelf, cooking-session CRUD.
- Warm illustrated UI in `apps/web` (single-page shell; design tokens in CSS).
- Data dirs: `recipes/fixtures/` (seed data), `audit/`, `ingestion/runs/` (gitignored JSON logs), `automation/ingestion/`.
- Vercel monorepo `installCommand` / `buildCommand` + SPA rewrites on `apps/api`; web `dist` syncs to `apps/api/public/` on `npm run build`.

## CI verification

GitHub Actions `.github/workflows/verify.yml` runs `npm run typecheck` and `npm run build` on push/PR to `main`. This does **not** validate database connectivity, migration execution, sign-in email delivery, or two-user isolation.

## Still outstanding (do not claim complete)

- Executing migration against the Supabase Postgres instance.
- Private `DATABASE_URL` (transaction pooler) and web/API env on Vercel.
- End-to-end run with populated catalog; no integration or smoke tests in CI yet.
- Bulk historical JSON added under `recipes/` + reviewed publish via importer (#4).
- `/ingredients/suggest`, `/authors`, pagination cursors, richer search ranking.
- ESLint/Prettier/Vitest toolchain (roadmap Phase 1 — not added yet).
- Vercel project import ([checklist](VERCEL_IMPORT_CHECKLIST.md)), preview smoke tests, production pilot (#1–#5).

## First acceptance run

Once DB access exists: `npm install`, env files, apply `0001` + `0002`, `npm run db:seed`, `npm run dev`, then verify health, search “miso”, sign-in, cooking journal, two users' isolated data.

## Where to look in code

| Area | Location |
|------|----------|
| API entry | `apps/api/src/index.ts`, `apps/api/src/app.ts` |
| Routes | `apps/api/src/routes/` |
| Schema | `apps/api/src/db/schema.ts` |
| Web shell | `apps/web/src/App.tsx` |
| Shared DTOs | `packages/shared/src/index.ts` |
| Importer | `automation/ingestion/import-recipes.ts` |
| Spec index | `docs/README.md` |
| Release scope | `docs/VERCEL_RELEASE_SCOPE.md` |
