# Foundation implementation status (2026-10-10)

## Deployed stack

- npm workspaces: `apps/web` (Next.js 15), `packages/shared`.
- UI + API on one origin: App Router pages and `/api/v1` Route Handlers.
- Drizzle schema in `apps/web/lib/db/`; Supabase Auth on client + server JWT verify.
- Vercel project root: **`apps/web`** ([`apps/web/vercel.json`](../apps/web/vercel.json)).
- Warm illustrated UI per [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md); routes: `/`, `/recipes`, `/recipes/[slug]`, `/books`.

## CI

GitHub Actions `.github/workflows/verify.yml` runs `npm run typecheck` and `npm run build` on push/PR to `main`.

## Still outstanding

- Confirm Supabase migrations + seed on production database.
- Align Vercel env vars (`DATABASE_URL` pooler, `NEXT_PUBLIC_*` for Supabase).
- Supabase Auth redirect URLs for production and preview domains.
- P0 product gaps from [`VERCEL_RELEASE_SCOPE.md`](VERCEL_RELEASE_SCOPE.md) (filters, automated isolation tests, bulk recipe import).

## Where to look in code

| Area | Location |
|------|----------|
| API routes | `apps/web/app/api/v1/` |
| Schema | `apps/web/lib/db/schema.ts` |
| UI shell | `apps/web/components/SousbotApp.tsx` |
| Shared DTOs | `packages/shared/src/index.ts` |
| Importer | `automation/ingestion/import-recipes.ts` |
