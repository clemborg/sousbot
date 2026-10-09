# Sousbot

A curated recipe collection with source references, cookbook attribution, incremental quality audits, and execution logs. Migrated from the recipe-knowledge-base directory in `clemborg/Clemport` on 2026-10-09.

## Structure

- `recipes/`: one recipe JSON document per recipe.
- `audit/README.md`: required audit protocol and persistent verification criteria.
- `audit/reviews/`: per-recipe review records with the checked recipe's blob SHA.
- `audit/runs/`: quality-audit run logs.
- `ingestion/runs/`: recipe-discovery run logs.
- `research/`: research records and provenance.

## Data quality

A recipe's presence here is **not** proof that its cookbook/page metadata has been verified. Respect the `cookbook_verified` and `page_verified` fields and the independent audit records. Some records may reference the authors' other cookbooks or online-only recipes. Existing duplicate variants are preserved pending verification.

## Operations

The existing ChatGPT scheduled expansion and audit tasks are configured separately and should target **this repository**. Future GitHub Actions automation can live in `.github/workflows/`. Store API keys only in GitHub Secrets, never in this public repository.

## Migration

Recipe files and audit state are preserved from Clemport. The historical text of the source project's original README is at `research/Clemport-legacy-README.md`. Historical run reports may refer to old Clemport paths; they are retained unchanged for provenance.
