# Build plan — foundation to first usable release

This is the sequenced execution backlog. Check items only once committed/tested; these docs themselves do not mean implementation is done.

**Legend:** `[x]` = in repo and builds; `[~]` = partial; `[ ]` = not started or blocked.

## Phase 0 — repository/data readiness (blocking)

- [ ] Verify complete one-time migration from Clemport into Sousbot: 155 JSON recipe files as of 2026-10-09, audit/research/ingestion files, path+SHA reconciliation.
- [ ] Confirm no scheduled task is still writing to Clemport; enable Sousbot-targeted jobs **only after** data validation.
- [~] Establish catalog source-of-truth policy and public-display rights check (documented in specs; enforcement tooling pending).
- [ ] Inventory legacy schema variations, source quality and known duplicate variants.
- [~] Set initial UX skeleton/wireframe for Discover, Recipe, My Books, Log cooking (implemented in web scaffold; design system doc is authoritative).
- **Acceptance:** verified file inventory and checksums; importable samples; no user history needed yet.

## Phase 1 — TypeScript monorepo and backend core

- [x] Configure npm workspaces: `apps/web`, `apps/api`, `packages/shared`.
- [~] Set ESLint, Prettier, TypeScript strict mode, Vitest, environment examples (strict TS + env examples yes; lint/test runners not yet).
- [~] Create Supabase project (user-controlled), env connection config and migration system (Drizzle schema + SQL migration file; DB not applied).
- [x] Implement catalog tables plus private user tables; constraints, indexes, documented RLS policies (RLS in SQL migration — apply to verify).
- [x] Create Express health endpoint and validation/error middleware.
- [~] Verify Supabase Auth bearer token server-side and test private per-user query scoping (middleware implemented; automated multi-user tests pending).
- **Acceptance:** fresh DB can migrate, API starts, CI tests pass, no secrets in repo.

## Phase 2 — catalog import + browsing

- [~] Build idempotent JSON importer to staging; preserve raw record and source hash (CLI + provenance table; bulk archive still pending in `recipes/`).
- [ ] Manually publish a small verified sample. Do not bulk-publish all 155 without quality gate.
- [ ] Populate canonical authors and books, source evidence, basic ingredient normalization/aliases.
- [~] Implement public `GET /recipes`, `/recipes/:slug`, `/ingredients/suggest`, `/books`, `/authors` (core recipe/book routes yes; suggest/authors not yet).
- [~] Build mobile-first Discover search, filters and recipe detail cards; accessible loading/error/empty states (discover + my-books filter; no URL routing yet).
- **Acceptance:** search “brussels sprouts” and “miso” as independent one-term queries, select result, see legitimate source/book link, no fabricated pages.

## Phase 3 — users, My Books, dated cooking sessions

- [x] Supabase login/logout/session UI; support anonymous public browsing.
- [x] Add owned books and “My books only” filter (API + discover checkbox).
- [x] Implement `POST/GET/PATCH/DELETE` cooking sessions scoped to current user.
- [x] Build fast cooking log dialog with browser-local date default and optional notes (includes edit/delete in journal).
- [x] Show ordered historical dates + notes on recipe detail and last-cooked snippet on result cards.
- [ ] Integration tests with two users proving private histories do not leak.
- **Acceptance:** each cook adds a dated occasion; history persists across sessions; edits/deletions are authorized; users see their own shelf and notes only.

## Deployment milestone — Vercel (after database/local vertical slice)

- [~] Connect **one Vercel project** rooted at `apps/api` (Express + synced Vite `public/`; vercel.json committed; project not imported).
- [ ] Validate shared npm-workspace build + sync on Vercel; confirm same-origin `/api/v1` requests in preview and production.
- [ ] Configure Vercel encrypted environment variables: `VITE_*` Supabase URL/publishable key, API Supabase URL/publishable key, protected `DATABASE_URL` from Supabase transaction pooler; optional `WEB_ORIGIN` for custom domain. Keep migration-only DB credentials outside the client.
- [ ] Check SSL and Postgres pool size=1 in Functions. Verify health, ingredient search, Supabase Auth redirect and private cooking-history isolation on a deployed preview.
- [x] Set up Vite client-side route fallback (`apps/api/vercel.json` rewrites).
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
