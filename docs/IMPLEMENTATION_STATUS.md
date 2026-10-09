# Foundation implementation status (2026-10-09)

## Committed scaffold (not deployed)

- npm workspaces with React 19 + Vite + TypeScript web and Node/Express + TypeScript API.
- Shared Zod contracts and runtime input validation.
- Supabase URL wired in non-secret environment examples; publishable key must be populated locally; Postgres connection string must be supplied in a secure environment.
- Supabase Auth email magic link frontend and server JWT verification.
- PostgreSQL/Drizzle schema for recipe catalog, authors, books, optional book edition/page, user shelves and dated cooking sessions.
- Proposed initial SQL migration in `supabase/migrations/0001_foundation.sql`; **not executed against Supabase**.
- Initial search, recipe detail, recipe cooking-session write/read/update/delete API and minimal frontend flows.
- API only renders recipe method if `directions_display_policy = authorized`.

## CI verification

GitHub Actions workflow `.github/workflows/verify.yml` successfully completed dependency installation, TypeScript typechecking, and production builds on 2026-10-09. This does **not** validate database connectivity, migration execution, sign-in configuration, or two-user row authorization.

## Still outstanding (do not claim complete)

- Executing migration against user's Supabase Postgres instance.
- Providing database URL privately in API hosting/local environment; public publishable key env config.
- Running the application end-to-end with a configured Supabase database and separate user accounts; automated integration tests are not yet present.
- Migrating Clemport's 155 recipe JSON files into Sousbot and implementing the importer.
- Publication/rights policy enforcement, source audit and ingredient normalization coverage.
- Search ranking, cookbook filters/owned-books-only search, pagination, production hardening and deployment.
- Formal automated integration tests and deployment configuration; CI for typechecking/build is now configured and green.

## First acceptance run

Once DB access exists: `npm install`, `npm run typecheck`, `npm run build`; run `0001_foundation.sql`; `npm run dev`; confirm health endpoint, anonymous browse, email sign-in and two independent users' cooking histories. The catalog starts empty until explicitly populated.

## Deployment target decided

Vercel will host React/Vite and Express as two related projects from the same repository; Supabase remains the database and identity provider. The Express scaffold now supports an exported app and reduced connection pool in Vercel. See `docs/VERCEL_DEPLOYMENT.md`. The project has **not** been imported into or deployed on Vercel; no live database connection is claimed.
