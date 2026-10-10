# Foundation implementation status (2026-10-10)

## Deployed stack

- npm workspaces: `apps/web` (Next.js 15), `packages/shared`.
- UI + API on one origin: App Router pages and `/api/v1` Route Handlers.
- Drizzle schema in `apps/web/lib/db/`; Supabase Auth on client + server JWT verify.
- Vercel project root: **`apps/web`** ([`apps/web/vercel.json`](../apps/web/vercel.json)).
- Production URL: **https://sousbot.vercel.app** (health + catalog live).

## Production database (Supabase `kkdswyfeznxrntungivm`)

| Artifact | Count / state |
|----------|----------------|
| Migrations | `0001_foundation`, `0002_recipe_provenance` applied |
| Published recipes | 3 (fixtures) |
| Books (pilot catalog) | 12 |
| `recipe_book_refs` | 1 pilot QA link (miso ↔ *Japanese Home Cooking*, unverified display) |

## CI

GitHub Actions `.github/workflows/verify.yml` runs `npm run typecheck` and `npm run build` on push/PR to `main`.

## Pilot blockers (owner)

1. **Supabase Auth** — Site URL `https://sousbot.vercel.app`, redirect allowlist; local `http://localhost:3000/**`.
2. **Vercel Preview env** — mirror `NEXT_PUBLIC_*`, `SUPABASE_*`, `POSTGRES_URL`/`DATABASE_URL` if testing previews.
3. **D3 privacy smoke** — two emails on production after auth URLs.
4. **Bulk recipes** — add reviewed JSON under `recipes/`; import with `npm run import:recipes:apply` / publish policy.

## Still outstanding (product)

- Richer discover filters, pagination/cursors, ingredient aliases/ranking.
- Automated two-user authorization tests.
- Legacy corpus migration (155 JSON inventory) with audit gates.

## Where to look in code

| Area | Location |
|------|----------|
| API routes | `apps/web/app/api/v1/` |
| Schema | `apps/web/lib/db/schema.ts` |
| Search / my-books filter | `apps/web/lib/recipes/search.ts` |
| UI shell | `apps/web/components/SousbotApp.tsx` |
| Shared DTOs | `packages/shared/src/index.ts` |
| Importers | `automation/ingestion/import-recipes.ts`, `import-books.ts` |
