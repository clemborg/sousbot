# Sousbot on Vercel — first-release delivery scope

**Status:** scoped; not yet deployed. **Date:** 2026-10-09.  
**Goal:** Give 2–5 early users (including the owner's mother) a web address where they can search an ingredient, choose a recipe, consult its source/cookbook, and privately record dated cooking notes. No native app, no meal planner, no AI-powered ingredient combination needed for first release.

This is the **delivery contract for the first Vercel pilot**, not a promise that application features, Supabase tables or recipe data are already deployed. See [detailed deployment runbook](VERCEL_DEPLOYMENT.md) and [implementation status](IMPLEMENTATION_STATUS.md).

## Architecture / fixed decisions

```text
GitHub main ── Vercel project (root: apps/api)
                │   public/ CDN + Express /api/v1
                │   same origin; optional WEB_ORIGIN / VERCEL_URL
                ▼
            Supabase Postgres + Supabase Auth

GitHub recipe/audit archive → separately controlled importer → Supabase catalog
```

- **Hosting:** one Vercel project from `clemborg/sousbot` (`apps/api` root), npm workspaces, not Next.js.
- **Data:** Supabase project `kkdswyfeznxrntungivm`, which is already identified in local example configuration. Keep its database password out of GitHub and chat; publishable keys may be used in browser builds, service-role/database credentials must never be there.
- **API:** `apps/api/index.ts` exports the bundled Express app for Vercel; `src/dev.ts` runs `listen()` locally.
- **UI:** Vite build synced to `apps/api/public/` at build time; SPA rewrites in `apps/api/vercel.json`.
- **Function → Postgres:** Supabase transaction pooler port 6543, TLS, conservative pool size (existing `pg.Pool` max=1 per Vercel function instance). Avoid named prepared statements/connection session state; migrations via separate approved channel.
- **Authorization:** verified Supabase JWT on API; private queries always constrained by verified user ID even when privileged DB connection bypasses RLS. Public catalog only includes `published` recipes.
- **Research automation:** GitHub/scheduled worker, not dependent on permanent server processes or the Vercel web request runtime.

## P0 user-facing pilot: required scope

| Workflow | Must work at launch | Explicitly not required at launch |
|---|---|---|
| Discover | Input one ingredient (e.g., *miso*), see published relevant recipes, open recipe | Pantry inventory, combining multiple ingredients, AI |
| Recipe | Title, author, ingredients, legitimate online source; book + page **only when verified** | Full copyrighted cookbook text and images without authorization |
| Personal cookbook shelf | Login, add/remove owned titles; distinguish owner from other users | ISBN scanning / edition matching automation |
| Cooking history | Log multiple occasions on same recipe, date defaults locally, optional note, chronological history, user-specific last-cooked on card | Social feeds, elaborate reviews |
| User sessions | Email link signup/login, authenticated write, anonymous catalog browse | Admin console |
| Data | At least 3 real, reviewed recipe records imported to published catalog | Immediate publication of all 155 unaudited source JSONs |

**Additional P0 product gap:** current scaffold provides basic searching, book ownership and create/delete cooking logs, but currently lacks completed search filters, edit-log UI, ingredient alias ranking, robust pagination, automated authorization tests and production hardening. Do not confuse a passing build with these workflows being finished.

## Vercel project — provisional configuration

| Property | Value |
|---|---|
| Proposed project name | `sousbot` (or `sousbot-app`) |
| Git repository | `clemborg/sousbot` |
| Root Directory | `apps/api` |
| Framework | Express / Node.js Function |
| Node | 22+ |
| API entry | `index.ts` → `dist/index.js` default export |
| Static UI | `public/` (synced from `apps/web/dist` at build) |
| Shared dependency | `@sousbot/shared`; build before web and API |
| Routing | SPA fallback + Express routes under `/api/v1` in [`apps/api/vercel.json`](../apps/api/vercel.json) |

**Build configuration validation required:** Vercel's monorepo install/root resolution must discover the npm-workspace root and run the full build + sync on the first preview. GitHub Actions verifies root `npm run build`, **not** the Vercel environment until a deploy runs.

## Environment variable matrix (single project)

| Variable | Required | Exposure / notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Public project URL; embedded at web build |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Publishable client key; embedded at web build |
| `VITE_API_BASE_URL` | No | Omit for same-origin `/api/v1` |
| `SUPABASE_URL` | Yes | Public project URL (API runtime) |
| `SUPABASE_PUBLISHABLE_KEY` | Yes | Token verification on API |
| `DATABASE_URL` | Yes | Secret; transaction pooler 6543 + TLS |
| `WEB_ORIGIN` | No | Defaults to `https://$VERCEL_URL`; set for custom domain |
| `NODE_ENV`, `VERCEL`, `VERCEL_URL` | Platform | Vercel sets where applicable |

**Environment separation:** production and preview variables are managed separately. Default to a **test/preview DB or isolated dataset** until rollout strategy is explicit; do not let anonymous preview links mutate production user data without review. Set Supabase Auth redirect URLs for approved origins.

## Work packages in execution order

### D0 — deployment prerequisites

1. Confirm the Vercel account/team can import the GitHub repository.
2. Preserve deployment credentials in Vercel encrypted env settings, not source files.
3. Review/apply `supabase/migrations/0001_foundation.sql` against the intended Supabase project (not yet run).
4. Establish production vs preview database/isolation strategy.

### D1 — get code onto Vercel

1. Create one project rooted at `apps/api`; verify monorepo build, sync to `public/`, and Vite SPA routing.
2. Confirm an unauthenticated API read returns a controlled response, not a 500 from missing configuration; health endpoint must verify DB connection.
3. Verify network requests from the rendered React page hit same-origin `/api/v1`.

### D2 — connect catalog and identity

1. Complete and verify legacy recipe migration from Clemport to Sousbot. **155 JSON files were observed at last source inventory; count is not a claim of migrated unique dishes.**
2. Implement importer with provenance and publication gate; publish a handful of reviewed records.
3. Confirm independent ingredient queries, legitimate source links, and **optional** cookbook references.
4. Configure Supabase Auth production/preview email redirect and verify session recovery.

### D3 — diary workflow and privacy

1. Add cookbook to personal shelf; verify it appears only for that user.
2. Log a cook today with free-text note, then another cook of same recipe with backdated date and different note; both survive reload.
3. Edit the first cooking occasion, delete the second; never overwrite all sessions by recipe ID.
4. Verify separate account cannot read/change other account's history, shelf or last-note summaries; anonymous visits cannot read notes.

### D4 — pilot release gate

1. CI and deployed smoke tests pass; configure basic logging and error monitoring (without sensitive tokens/note bodies).
2. Review rollout domain/redirect allowlist, function limits, Supabase connection usage, budget, backup, rollback.
3. Give pilot users the production web link; treat the first test as a small release, not a public unrestricted launch.

## Acceptance tests / definition of ready

- [ ] Vercel project builds from `main` with npm-workspace shared-package imports resolved and web assets in `public/`.
- [ ] Frontend loads and API health checks DB; no secrets in browser bundle.
- [ ] A search for **miso**, then a separate search for **brussels sprouts**, does not erroneously combine the two.
- [ ] A published recipe opens and exposes only independently supported author/book/page information.
- [ ] User A logs two different dated cooking occasions with two different notes on the same recipe; they persist after refresh.
- [ ] User B and anonymous viewers cannot view, edit or delete User A's notes or shelf.
- [ ] Supabase login emails complete and redirect to the deployed site, including an approved preview environment.
- [ ] Production has a rollback/checklist; unauthorized data and unreviewed recipe content are not published.
- [ ] One real pilot user successfully performs search → pick recipe → cooking note without developer intervention.

## Tracked GitHub work

- [#1](https://github.com/clemborg/sousbot/issues/1) — Vercel monorepo build validation.
- [#2](https://github.com/clemborg/sousbot/issues/2) — database initialization + safe connection pooling.
- [#3](https://github.com/clemborg/sousbot/issues/3) — auth/CORS and private diary workflow.
- [#4](https://github.com/clemborg/sousbot/issues/4) — legacy transfer and initial published catalog.
- [#5](https://github.com/clemborg/sousbot/issues/5) — release hardening and monitoring.

## Open decisions (none blocks writing more code)

- **Domain:** Vercel default domains first; custom domain only if the pilot warrants it.
- **Preview:** separate preview Supabase project/dataset vs a single project with isolated schema/test accounts.
- **Public access:** invite-only pilot versus public anonymous catalog browsing with private user records. Proposed baseline: anonymous browse, authenticated note/shelf actions; limit initial exposure until catalog rights reviewed.
- **Book data:** permitted artwork source and ISBN/edition lookup provider; do not gate the first pilot on book cover images.
- **Deployment setup:** Vercel dashboard connection/permissions require the owner's account; do not pretend GitHub commits create Vercel projects automatically.

## Evidence

- [Vercel Express framework](https://vercel.com/docs/frameworks/backend/express) — recognized `src/index.ts` default export, `public/` for static assets.
- [Vercel monorepos](https://vercel.com/docs/monorepos) — project root directory and workspace detection.
- [Supabase Postgres connections](https://supabase.com/docs/guides/database/connecting-to-postgres) — transaction pooler use for serverless, and prepared-statement caveat.
