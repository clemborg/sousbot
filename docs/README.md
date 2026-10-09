# Sousbot — product and engineering specification

**Status:** Application scaffold committed; Vercel pilot scoped; not yet deployed.  
**Last updated:** 2026-10-09.

Sousbot is an ingredient-first recipe discovery web app. It maintains a shared recipe catalog, connects recipes to cookbooks when supported by evidence, and lets each user privately record **dated cooking occasions and notes**. A cookbook is an optional filter, not a requirement to use the product.

## Read in order

1. [Product scope / MVP](PRODUCT.md) — outcomes, non-goals, user stories, acceptance criteria.
2. [User flows and UX](USER_FLOWS.md) — ingredient search, cookbook discovery, quick cooking logs.
3. [Architecture](ARCHITECTURE.md) — React / Node / Supabase, security and deployment.
4. [Data model](DATA_MODEL.md) — canonical recipes, edition-specific pages, ingredient synonyms, user history.
5. [API contract](API_CONTRACT.md) — initial endpoints, search semantics and example requests.
6. [Data operations](DATA_OPERATIONS.md) — migration, incremental ingest, validation, provenance, publication.
7. [Implementation roadmap](ROADMAP.md) — sequenced deliverables with explicit definition of done.
8. [First Vercel pilot scope](VERCEL_RELEASE_SCOPE.md) — launch criteria, two-project setup, env matrix, GitHub issues and blockers.
9. [Vercel deployment runbook](VERCEL_DEPLOYMENT.md) — hosting details and deployment risks.

## Principles

- **Find something to cook without already knowing a dish.** Searching one ingredient such as “brussels sprouts” or “miso” should be effortless; these are **independent searches**, not an implicit multi-ingredient query.
- **All recipes are searchable by default.** “My books only” is an optional filter.
- **Cookbooks provide provenance and a route back to the physical book.** Book/page are displayed only if corroborated; pagination is tied to an edition when known.
- **Each cooking occasion is one dated record**, with optional notes; general notes are separate.
- **Shared catalog, private history.** All users search the same public recipe catalog but have independent book ownership, bookmarks, notes and cooking history.
- **Do not mistake research for publication.** A recipe's author, online source, cookbook membership, page, and safety/completeness are separate verification claims.

## Current repository status

A React/Vite web scaffold, Express API, shared TypeScript package, initial SQL migration, and GitHub Actions build verification have been committed. **This is not a deployed app**, and the Supabase schema has **not been applied**. The legacy collection of **155 JSON files remains in Clemport** pending a verified copy. The ingestion/audit tasks remain paused until migration is verified. Never seed, count, or publish presumed migrated records.
