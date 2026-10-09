# Recipe archive status

**Last updated:** 2026-10-09

**Source of truth:** JSON under [`recipes/`](../recipes/) in this repository. The importer reads only paths inside Sousbot Git — not external repositories at runtime.

## Current inventory

| Location | Status |
|----------|--------|
| `recipes/fixtures/` | 3 dev seed recipes (miso, Brussels sprouts, pasta) |
| `recipes/` (bulk archive) | Awaiting addition of historical JSON files to Git |
| `audit/`, `ingestion/runs/` | Placeholders; run logs written locally (gitignored) |

## Tooling

- Import: `npm run import:recipes` (dry-run), `npm run import:recipes:publish` (apply + publish gate)
- Dev seed: `npm run db:seed` → fixtures only
- Provenance: `supabase/migrations/0002_recipe_provenance.sql` + SHA skip in [import-recipes.ts](../automation/ingestion/import-recipes.ts)

## Historical note

A one-time bulk collection (~155 JSON files) was previously maintained elsewhere. Those files must be **committed under `recipes/`** here before bulk import. Clemport is not an runtime dependency.
