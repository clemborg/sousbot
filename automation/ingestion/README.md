# Ingestion automation

## import-recipes.ts

Reads JSON from the **Sousbot Git archive** under `recipes/` (default) and upserts into Supabase Postgres.

```bash
# Validate fixtures without DB
npm run import:recipes -- --dir recipes/fixtures

# Write draft rows
npm run import:recipes:apply -- --dir recipes

# Publish rows that pass the gate (source URL + ingredients + --publish)
npm run import:recipes:publish -- --dir recipes/fixtures
```

Requires `apps/api/.env` with `DATABASE_URL` for `--apply`. Logs each run under `ingestion/runs/`.

Apply SQL migrations `0001_foundation.sql` and `0002_recipe_provenance.sql` before the first import.

Idempotency: unchanged file bytes (SHA-256) at the same `origin_path` are skipped.
