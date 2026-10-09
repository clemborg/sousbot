# Technical architecture — proposed foundation

## Stack (decided)

- **Frontend:** React 19 + TypeScript + Vite, React Router; Tailwind CSS/shadcn-ui as a proposed UI choice (not yet installed).
- **Backend:** Node.js + Express + TypeScript; versioned REST endpoints under `/api/v1`.
- **Database:** PostgreSQL hosted by **Supabase**, accessed by backend through **Drizzle ORM** and migration scripts.
- **Authentication:** Supabase Auth, user JWT from web app; API verifies token server-side via Supabase Auth and derives `user_id` from the verified identity, never from client payload.
- **Validation/shared contracts:** Zod schemas in a shared workspace.
- **Search:** PostgreSQL relational ingredient matching, aliases and title full-text/trigram indexes. No LLM in request path for MVP.
- **Catalog ingestion:** version-controlled raw recipe JSON and audit ledgers; idempotent import into staging; controlled promotion to published catalog.
- **Deployment target (decided): Vercel**. Deploy the React/Vite web frontend and Express API as **two Vercel projects from this npm-workspace monorepo** (`apps/web` and `apps/api`). Supabase remains the database/Auth host; background recipe ingestion and auditing remain independent jobs, not resident Express processes. See [Vercel deployment plan](VERCEL_DEPLOYMENT.md).

## Monorepo target

```text
sousbot/
  apps/
    web/                  # React/Vite, routes, search, recipe detail, cook logging
    api/                  # Express REST API, authentication, services and data access
  packages/
    shared/               # Zod DTOs, types, normalized ingredient types
  supabase/
    migrations/           # schema and RLS policies, reviewed before application
  automation/
    ingestion/            # archive import + staging + dedupe
    audit/                # source, attribution, page verification
  recipes/                # migrated legacy recipe JSON (after verified migration)
  audit/                  # existing legacy review ledger (after migration)
  ingestion/
  docs/
```

Use npm workspaces initially. Avoid unnecessary microservices or external search engines while the dataset is small.

## Trust boundaries

**Public visitor:** may request published catalog data; cannot see private cooking logs, shelves or notes. **Signed-in user:** may access only personal records. **Admin/ingestion worker:** may create draft/source-checked catalog records and trigger audit/publish, not blindly make unreviewed recipes visible.

User-data access:
1. Web signs in via Supabase Auth; carries access token over TLS to API.
2. API verifies user with Supabase Auth (e.g., `supabase.auth.getUser(token)`); rejects expired/invalid tokens.
3. API queries PostgreSQL and **always constrains mutable/private rows to the verified `user_id`**. Never accept `user_id` from POST/PUT body.
4. Database has ownership foreign keys, constraints, and RLS policies for user tables; **direct privileged/owner Drizzle connections may bypass RLS**, so route-level scoping and endpoint tests are mandatory. Do not treat RLS alone as the API security boundary.
5. Client never receives Supabase service-role secret, PostgreSQL password or ingestion credentials. CORS and rate limits for public search / auth endpoints.

## Frontend / backend boundaries

- React owns presentation, URL query state, forms, optimistic feedback and session UI.
- Express owns query interpretation, pagination limits, ranking, user authorization, validation, and edit audit trails.
- Postgres owns normalization, referential integrity and transactional updates. Search returns IDs and stable DTOs.
- No arbitrary SQL from clients; parameterized queries via ORM/query builder.
- Do not expose entire unlicensed source text through an API.

## Performance / operational basics

- Search response target p95 < 500ms on an appropriately sized test dataset, excluding initial cold starts; measure before optimizing.
- Query lengths, page size and rate limits bounded; indexes for ingredient canonical IDs/aliases, recipe titles, publication status, cookbook refs, and private history (`user_id,recipe_id,cooked_on DESC`).
- API structured logs with run IDs and request IDs; no tokens or cooking-note bodies in logs.
- App monitoring for API errors/import status; GitHub Actions or similar for periodic ingestion with no concurrent publishing races.
- Migrations run as controlled deployment step; never on every API server startup.

## Copyright / content boundary

Book metadata and page references do not grant rights to republish copyrighted cookbook narrative instructions or images. Track license/reuse status at source/recipe level. For unsupported display rights, show ingredients only where lawful/appropriate and refer to authorized external source or book. No copying of cookbook covers without rights or licensed provider.

## Migration gate

At time of scoping, **Sousbot does not yet contain the 155 JSON recipe files** in Clemport. The first engineering task is verified migration, inventory reconciliation and a repeatable importer, before a production catalog count can be displayed.

## Deployment-first constraints (Vercel)

- Vercel supports Express through a Node.js Function. The API module exports `app` and skips `app.listen()` in the Vercel environment, while keeping the local development listener.
- A Vercel Function instance must **not** create a 10-connection Postgres pool; use a one-connection pool on Vercel with the Supabase **transaction pooler** endpoint (port 6543). Keep the pool at module scope for warm-instance reuse, use TLS, and avoid named prepared statements. A separate direct/session connection may be used for reviewed DB migrations.
- The browser builds from `apps/web` and calls the deployed API via `VITE_API_BASE_URL`. Configure the backend's `WEB_ORIGIN` to the exact frontend origin; preview-origin policy requires explicit work before public preview releases.
- Browser routes will need the Vite SPA fallback for deep links. Both Vercel projects must build `packages/shared` before their app package; preserve npm workspace installs.
- Deploying the web and API does **not** automatically create tables or import the cookbook collection. Keep migrations and recipe ingestion separately controlled.
