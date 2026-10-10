# Sousbot on Vercel — first-release delivery scope

**Status:** production deployed at [sousbot.vercel.app](https://sousbot.vercel.app); pilot data partially seeded. **Date:** 2026-10-09 (updated 2026-10-10).  
**Goal:** Give 2–5 early users (including the owner's mother) a web address where they can search an ingredient, choose a recipe, consult its source/cookbook, and privately record dated cooking notes. No native app, no meal planner, no AI-powered ingredient combination needed for first release.

This is the **delivery contract for the first Vercel pilot**. See [deployment runbook](VERCEL_DEPLOYMENT.md), [import checklist](VERCEL_IMPORT_CHECKLIST.md), and [implementation status](IMPLEMENTATION_STATUS.md).

## Architecture / fixed decisions

```text
GitHub main ── Vercel project (root: apps/web)
                │   Next.js UI + Route Handlers /api/v1
                │   same origin; optional WEB_ORIGIN / VERCEL_URL
                ▼
            Supabase Postgres + Supabase Auth

GitHub recipe/audit archive → separately controlled importer → Supabase catalog
```

- **Hosting:** one Vercel project from `clemborg/sousbot` (`apps/web` root), npm workspaces, **Next.js 15** App Router.
- **Data:** Supabase project `kkdswyfeznxrntungivm`. Database credentials stay in Vercel env, not Git.
- **API:** `apps/web/app/api/v1/**` Route Handlers (Node runtime), Drizzle + `pg`.
- **UI:** React in `apps/web/components/` and App Router pages (`/`, `/recipes`, `/books`, …).
- **Function → Postgres:** Supabase transaction pooler port **6543**, TLS (`DATABASE_URL` or `POSTGRES_URL`), conservative pool size. Migrations and `--apply` imports use direct/session URLs from a developer machine.
- **Authorization:** verified Supabase JWT on API; private queries constrained by verified user ID even when the DB connection bypasses RLS. Public catalog only includes `published` recipes.
- **Research automation:** GitHub/scheduled worker, not the Vercel request runtime.

## Production snapshot (2026-10-10)

| Item | State |
|------|--------|
| Migrations `0001` / `0002` | Applied on `kkdswyfeznxrntungivm` |
| `/api/v1/health` | `database: connected` |
| Published recipes | 3 fixtures (`recipes/fixtures/`) |
| Book catalog | 12 titles via `books/fixtures/pilot-catalog.json` |
| Supabase Auth URL config | **Owner verify** — blocks trustworthy journal/shelf on prod |
| Preview env vars | **Owner verify** — often missing when Production is set |
| Two-user privacy smoke | **Not automated** — manual D3 after auth |

## P0 user-facing pilot: required scope

| Workflow | Must work at launch | Explicitly not required at launch |
|---|---|---|
| Discover | Input one ingredient (e.g., *miso*), see published relevant recipes, open recipe | Pantry inventory, combining multiple ingredients, AI |
| Recipe | Title, author, ingredients, legitimate online source; book + page **only when verified** | Full copyrighted cookbook text and images without authorization |
| Personal cookbook shelf | Login, add/remove owned titles; distinguish owner from other users | ISBN scanning / edition matching automation |
| Cooking history | Log multiple occasions on same recipe, date defaults locally, optional note, chronological history, user-specific last-cooked on card | Social feeds, elaborate reviews |
| User sessions | Email link signup/login, authenticated write, anonymous catalog browse | Admin console |
| Data | At least 3 real, reviewed recipe records imported to published catalog | Immediate publication of all 155 unaudited source JSONs |

**Additional P0 product gap:** filters, ingredient alias ranking, robust pagination/cursors, automated two-user isolation tests, and bulk legacy import remain open. A green build or deployed health check does not close D2–D4.

## Vercel project configuration

| Property | Value |
|---|---|
| Project name | `sousbot` |
| Git repository | `clemborg/sousbot` |
| Root Directory | `apps/web` |
| Framework | Next.js |
| Node | 22+ |
| Build | [`apps/web/vercel.json`](../apps/web/vercel.json) — root install, `@sousbot/shared` then `@sousbot/web` |
| API | `/api/v1/*` Route Handlers |

## Environment variable matrix (single project)

| Variable | Required | Exposure / notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public project URL; embedded at web build |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Publishable client key; embedded at web build |
| `SUPABASE_URL` | Yes | Public project URL (API runtime) |
| `SUPABASE_PUBLISHABLE_KEY` | Yes | Token verification on API |
| `DATABASE_URL` or `POSTGRES_URL` | Yes | Secret; transaction pooler **6543** + TLS on Vercel |
| `WEB_ORIGIN` | No | Optional custom domain CORS |
| `NODE_ENV`, `VERCEL`, `VERCEL_URL` | Platform | Vercel sets where applicable |

**Environment separation:** configure **Preview** and **Production** separately. Decide whether previews share the production Supabase project before handing out preview URLs. Set Supabase Auth redirect URLs for each origin you use for magic links.

## Work packages in execution order

### D0 — deployment prerequisites

1. ~~Confirm Vercel can import the GitHub repository.~~ **Done** (`sousbot.vercel.app`).
2. ~~Preserve credentials in Vercel encrypted env.~~ **Done** (production).
3. ~~Apply `0001` / `0002` migrations.~~ **Done** on target project.
4. **Open:** preview vs production DB strategy; Preview env parity.

### D1 — get code onto Vercel

1. ~~Create project rooted at `apps/web`; monorepo build.~~ **Done**.
2. ~~Health endpoint verifies DB.~~ **Done**.
3. ~~Same-origin `/api/v1` from browser.~~ **Done**.

### D2 — connect catalog and identity

1. Legacy Clemport migration (155 JSON inventory) — **not done** for bulk.
2. Importer + fixtures — **partial** (3 published recipes; provenance via full import pipeline optional).
3. Ingredient search + sources — **works** on fixtures.
4. **Supabase Auth production/preview redirects** — **owner action**.

### D3 — diary workflow and privacy

1. Shelf add/remove — **testable** (book catalog seeded); verify on prod after auth.
2. Cooking log create/edit/delete — **implemented**; verify on prod after auth.
3. **Two-account privacy smoke** — **manual**, required before pilot invite.

### D4 — pilot release gate

1. CI green; basic error visibility without logging note bodies.
2. Rollback = redeploy previous Vercel deployment; no SQL from Functions.
3. One non-developer completes search → recipe → note.

## Acceptance tests / definition of ready

- [x] Vercel project builds from `main`; workspace packages resolve.
- [x] Frontend loads; API health checks DB; no DB secrets in client bundle.
- [ ] Supabase Auth Site URL + redirects for production (and previews if used).
- [ ] Preview env vars match production pattern where intended.
- [x] Search **miso** and **brussels sprouts** as independent one-term queries.
- [x] Published fixture opens with web source; no fabricated book/page on fixtures.
- [ ] User A: two dated notes on same recipe persist; edit/delete work.
- [ ] User B and anonymous cannot access A's notes or shelf.
- [ ] Magic link completes on deployed host; session survives reload.
- [ ] One pilot user completes search → recipe → note without developer help.

## Catalog seed (from developer machine)

```bash
# apps/web/.env — direct/session Postgres URL for --apply
npm run db:seed
```

Publishes `recipes/fixtures/` and upserts `books/fixtures/pilot-catalog.json` (including optional `pilot_shelf_links` for **My cookbooks only** QA — unverified refs; cards still omit cookbook until `book_verified` import).

## Tracked GitHub work

- [#1](https://github.com/clemborg/sousbot/issues/1) — Vercel monorepo build validation.
- [#2](https://github.com/clemborg/sousbot/issues/2) — database initialization + safe connection pooling.
- [#3](https://github.com/clemborg/sousbot/issues/3) — auth/CORS and private diary workflow.
- [#4](https://github.com/clemborg/sousbot/issues/4) — legacy transfer and initial published catalog.
- [#5](https://github.com/clemborg/sousbot/issues/5) — release hardening and monitoring.

## Open decisions

- **Domain:** Vercel default first; custom domain optional.
- **Preview DB:** isolated project vs shared Supabase with test accounts.
- **Public access:** anonymous catalog browse + authenticated private data (baseline).
- **Book imagery / ISBN:** not required for first pilot.

## Evidence

- [Vercel monorepos](https://vercel.com/docs/monorepos) — root directory and workspace detection.
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs) — App Router deployment.
- [Supabase Postgres connections](https://supabase.com/docs/guides/database/connecting-to-postgres) — pooler for serverless.
