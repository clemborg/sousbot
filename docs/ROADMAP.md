# Build plan — foundation to first usable release

This is the sequenced execution backlog. Check items only once committed/tested; these docs themselves do not mean implementation is done.

## Phase 0 — repository/data readiness (blocking)

- [ ] Verify complete one-time migration from Clemport into Sousbot: 155 JSON recipe files as of 2026-10-09, audit/research/ingestion files, path+SHA reconciliation.
- [ ] Confirm no scheduled task is still writing to Clemport; enable Sousbot-targeted jobs **only after** data validation.
- [ ] Establish catalog source-of-truth policy and public-display rights check.
- [ ] Inventory legacy schema variations, source quality and known duplicate variants.
- [ ] Set initial UX skeleton/wireframe for Discover, Recipe, My Books, Log cooking.
- **Acceptance:** verified file inventory and checksums; importable samples; no user history needed yet.

## Phase 1 — TypeScript monorepo and backend core

- [ ] Configure npm workspaces: `apps/web`, `apps/api`, `packages/shared`.
- [ ] Set ESLint, Prettier, TypeScript strict mode, Vitest, environment examples.
- [ ] Create Supabase project (user-controlled), env connection config and migration system (Drizzle).
- [ ] Implement catalog tables plus private user tables; constraints, indexes, documented RLS policies.
- [ ] Create Express health endpoint and validation/error middleware.
- [ ] Verify Supabase Auth bearer token server-side and test private per-user query scoping.
- **Acceptance:** fresh DB can migrate, API starts, CI tests pass, no secrets in repo.

## Phase 2 — catalog import + browsing

- [ ] Build idempotent JSON importer to staging; preserve raw record and source hash.
- [ ] Manually publish a small verified sample. Do not bulk-publish all 155 without quality gate.
- [ ] Populate canonical authors and books, source evidence, basic ingredient normalization/aliases.
- [ ] Implement public `GET /recipes`, `/recipes/:slug`, `/ingredients/suggest`, `/books`, `/authors`.
- [ ] Build mobile-first Discover search, filters and recipe detail cards; accessible loading/error/empty states.
- **Acceptance:** search “brussels sprouts” and “miso” as independent one-term queries, select result, see legitimate source/book link, no fabricated pages.

## Phase 3 — users, My Books, dated cooking sessions

- [ ] Supabase login/logout/session UI; support anonymous public browsing.
- [ ] Add owned books and “My books only” filter.
- [ ] Implement `POST/GET/PATCH/DELETE` cooking sessions scoped to current user.
- [ ] Build fast cooking log dialog with browser-local date default and optional notes.
- [ ] Show ordered historical dates + notes on recipe detail and last-cooked snippet on result cards.
- [ ] Integration tests with two users proving private histories do not leak.
- **Acceptance:** each cook adds a dated occasion; history persists across sessions; edits/deletions are authorized; users see their own shelf and notes only.

## Deployment milestone — Vercel (after database/local vertical slice)

- [ ] Connect **two Vercel projects** to this monorepo: `apps/web` as Vite and `apps/api` as Node/Express Function (project root directories).
- [ ] Validate shared npm-workspace builds in Vercel, set the API URL for browser builds, and confirm web-to-API requests in preview and production.
- [ ] Configure Vercel encrypted environment variables: public web Supabase URL/publishable key, API Supabase URL/publishable key, protected `DATABASE_URL` from Supabase transaction pooler, `WEB_ORIGIN`. Keep migration-only DB credentials outside the client.
- [ ] Check SSL and Postgres pool size=1 in Functions. Verify health, ingredient search, Supabase Auth redirect and private cooking-history isolation on a deployed preview.
- [ ] Set up Vite client-side route fallback, custom domain (optional), independent production and preview configs and smoke tests.
- **Acceptance:** same public web app works via Vercel, a verified signed-in user can create/revisit a dated cooking note, and there are no client-visible database credentials.

## Phase 4 — hardening and unattended ingestion

- [ ] Job scheduling and safe single-commit ingestion + audit in Sousbot/GitHub Actions; staging import jobs into Supabase.
- [ ] CI schema/source validation and publication gates, retry and conflict handling, audit record coverage report.
- [ ] Error monitoring, rate limiting, backups, admin-only repair/review workflow.
- [ ] Legal/content review for public display; clearly marked online-only records and book attribution states.
- [ ] Ship a responsive pilot to 2–5 testers including the user's mother.
- **Acceptance:** reliable daily operation without repeated interactive GitHub approvals, readable failures and source quality metrics.

## Deferred P1

- Saved recipes and general notes, rating/favorites, cookbook ISBN scanning, smarter ingredient alias/variant ranking, nutrition/dietary metadata (only if sourced), semantic recommendations if needed.

## Proposed first vertical slice

**Start with a thin end-to-end flow:** one ingested recipe → published in Supabase → search by ingredient in React → open detail → sign in → add dated note → revisit and see note on card/detail. This forces the important database/API/privacy decisions early and avoids building a feature-rich shell without core functionality.

## Definition of done for every milestone

- Code/docs committed to Sousbot.
- Build + relevant tests verified, or explicit blocker recorded.
- No raw credentials or user private notes in GitHub.
- Source-verification and cookbook-page claims backed by evidence.
- No unsafe cross-user access; regressions covered by tests.
