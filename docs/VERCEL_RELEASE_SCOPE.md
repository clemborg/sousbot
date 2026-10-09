# Sousbot on Vercel — first-release delivery scope

**Status:** scoped; not yet deployed. **Date:** 2026-10-09.  
**Goal:** Give 2–5 early users (including the owner's mother) a web address where they can search an ingredient, choose a recipe, consult its source/cookbook, and privately record dated cooking notes. No native app, no meal planner, no AI-powered ingredient combination needed for first release.

This is the **delivery contract for the first Vercel pilot**, not a promise that application features, Supabase tables or recipe data are already deployed. See [detailed deployment runbook](VERCEL_DEPLOYMENT.md) and [implementation status](IMPLEMENTATION_STATUS.md).

## Architecture / fixed decisions

```text
GitHub main ── Vercel project A (apps/web / React + Vite)
                │   public URL; VITE_API_BASE_URL
                ▼
             Vercel project B (apps/api / Express Function)
                │   private DATABASE_URL; Supabase JWT verification
                ▼
            Supabase Postgres + Supabase Auth

GitHub recipe/audit archive → separately controlled importer → Supabase catalog
```

- **Hosting:** two Vercel projects from `clemborg/sousbot` via npm workspaces, not Next.js.
- **Data:** Supabase project `kkdswyfeznxrntungivm`, which is already identified in local example configuration. Keep its database password out of GitHub and chat; publishable keys may be used in browser builds, service-role/database credentials must never be there.
- **API:** `apps/api/src/index.ts` exports Express's default application for Vercel Functions and only calls `listen()` outside Vercel.
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

## Vercel projects — provisional configuration

| Property | Web project | API project |
|---|---|---|
| Proposed project | `sousbot-web` | `sousbot-api` |
| Git repository | `clemborg/sousbot` | `clemborg/sousbot` |
| Root Directory | `apps/web` | `apps/api` |
| Framework | Vite | Express / Node.js Function |
| Node | 22+ | 22+ |
| Entrypoint | `index.html` / Vite | `src/index.ts` default export |
| Output | `dist` | Vercel-managed Function (no frontend output dir) |
| Shared dependency | `@sousbot/shared`; build it before frontend | `@sousbot/shared`; build it before API |
| Routing | SPA fallback in `apps/web/vercel.json` | Express routes under `/api/v1` |

**Build configuration validation required:** Vercel's monorepo install/root resolution must discover the npm-workspace root and build `packages/shared` before either dependent project. The repository's GitHub Actions build verifies the root workspaces, **not** the per-project Vercel build environment. Do not claim the build commands work on Vercel until their first preview deployments run. Override project install/build commands as needed based on actual Vercel logs.

## Environment variable matrix

| Variable | Web | API | Exposure / provenance |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Yes | No | Public project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | No | Publishable client key |
| `VITE_API_BASE_URL` | Yes | No | Public HTTPS origin of API project |
| `SUPABASE_URL` | No | Yes | Public project URL |
| `SUPABASE_PUBLISHABLE_KEY` | No | Yes | Publishable key for token verification |
| `DATABASE_URL` | **Never** | Yes | Secret; Supabase transaction pooler with TLS |
| `WEB_ORIGIN` | No | Yes | Explicit allowed frontend origin for CORS |
| `NODE_ENV`, `VERCEL` | Platform | Platform | Vercel handles these where applicable |

**Environment separation:** production and preview variables are managed separately. Default to a **test/preview DB or isolated dataset** until rollout strategy is explicit; do not let anonymous preview links mutate production user data without review. Set Supabase Auth redirect URLs for approved origins. Preview URLs can change; evaluate Vercel Related Projects / stable preview aliases / controlled CORS list rather than using wildcard CORS.

## Work packages in execution order

### D0 — deployment prerequisites

1. Confirm the Vercel account/team can import the GitHub repository and supports two Vercel projects.
2. Preserve deployment credentials in Vercel encrypted env settings, not source files.
3. Review/apply `supabase/migrations/0001_foundation.sql` against the intended Supabase project (not yet run).
4. Establish production vs preview database/isolation strategy.

### D1 — get code onto Vercel

1. Create web and API projects; verify Vercel monorepo workspace build and Vite SPA routing.
2. Confirm an unauthenticated API read returns a controlled response, not a 500 from missing configuration; health endpoint must verify DB connection.
3. Set `VITE_API_BASE_URL` and safe cross-origin CORS; verify network requests from the rendered React page.

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

- [ ] Both Vercel projects build from the same commit with npm-workspace shared-package imports resolved.
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

- [Vercel Express framework](https://vercel.com/docs/frameworks/backend/express) — recognized `src/index.ts` default export and Function runtime.
- [Vercel Vite framework](https://vercel.com/docs/frameworks/frontend/vite) — SPA deep-link rewrites.
- [Vercel monorepos](https://vercel.com/docs/monorepos) — separate project root directories and workspace detection.
- [Supabase Postgres connections](https://supabase.com/docs/guides/database/connecting-to-postgres) — transaction pooler use for serverless, and prepared-statement caveat.
