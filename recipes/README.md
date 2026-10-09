# Recipe archive (canonical JSON)

Individual recipe records live here as version-controlled JSON. The importer ([automation/ingestion/import-recipes.ts](../automation/ingestion/import-recipes.ts)) reads this tree and upserts into Supabase.

## Layout

- `fixtures/` — three published-quality dev samples used by `npm run db:seed`
- Add bulk historical JSON at the top level or in subfolders (any `**/*.json` except ignored paths)

## Commands

```bash
npm run import:recipes -- --dir recipes/fixtures   # validate only
npm run db:seed                                    # publish fixtures to DB
```

Do not commit unaudited bulk exports without review. See [data operations](../docs/DATA_OPERATIONS.md).
