# Recipe ingestion, audit, migration and publication

## Current state and immediate blocker

At scoping time, Sousbot contains only README/research status files. **155 legacy JSON recipe files and the audit history exist in Clemport and have not been verified in Sousbot.** The two former ChatGPT scheduled jobs are paused and retargeted to Sousbot; do not resume them before verified migration and quality controls.

### Safe transfer checklist

1. Inventory legacy `Clemport/recipe-knowledge-base/`: count JSON recipes, audit review JSONs and run reports, ingestion runs, research notes. Record per-file path + SHA/checksum.
2. Transfer into Sousbot at planned root paths: `recipes/`, `audit/`, `ingestion/`, `research/`; preserve file bytes, review SHAs, audit history and source links.
3. Compare **filenames and content checksums** between source and destination. Do not conflate 155 records with 155 unique dishes.
4. Resolve any path conflicts (Sousbot already has `research/migration-status.md`); retain both sets of notes.
5. Only then enable ingestion/audit tasks, after updating README and confirming paths. Do not delete Clemport until explicitly approved; retain as backup for now.

## Dataflow

```text
Authorized sources / publisher indexes / published chef recipes
     → discovered candidate + source URLs
     → extraction to source-preserving JSON
     → ingredient lines + method + provenance + explicit unknowns
     → duplicate/author/book-page checks
     → Git archive + persistent audit log
     → idempotent import into Postgres staging
     → publication eligibility checks
     → shared published recipe catalog
     → app via API
```

GitHub is a provenance archive and workflow orchestration surface, not the runtime search database. Avoid having clients request repository JSON directly.

## Import contract

- Preserve original raw JSON and `origin_repo` / `origin_path` / `origin_sha`.
- Schema deviations are expected: legacy `source_validation` is sometimes a string, sometimes an object; `cookbook_verified` may be absent; `servings` is often free-form text.
- Map author/title/source from record fields only; preserve original ingredient line order and method steps if authorized for display; do not use `cookbook` string as proof of inclusion.
- Use stable `origin_path` → canonical recipe ID mapping with content SHA/version; reruns with identical SHA are no-ops, altered SHA triggers a re-review/import update.
- Build normalized ingredient lookup incrementally while retaining `raw_text` if parser confidence low.
- Link cookbook edition and page only with explicit supporting evidence; book-level evidence must not be promoted to edition-level page proof.
- Detect probable duplicates using slug + title/author + ingredients, then queue for review. The two Batali Basic Tomato Sauce records are **known near-duplicates** and should not inflate “unique dish” metrics.

## Suggested publishing rules

**Draft:** new extraction, missing or inconsistent source.  
**Source checked:** URL resolves, author/dish/major ingredients supported; exact cookbook membership may still be unknown.  
**Published:** coherent title, legitimate traceable source, sufficient accurate ingredient data for discovery, source rights assessed; book/page optional.  
**Flagged:** known source mismatch, duplicate conflict, unsafe or materially incomplete recipe; may be excluded until corrected.

Store each property separately: `author_verified`, `book_verified`, `page_verified`, `ingredient_accuracy`, `method_accuracy`, `display_rights`. Publication is a business policy, not an AI confidence score.

## Batch safety / audit

- Stage a batch locally/in memory and validate all JSON before writing.
- One Git Data tree/commit/ref update per batch where possible, protecting against concurrent main changes by checking branch head; never force-push over another worker.
- In Postgres, import transactionally and log run errors. Use advisory locks or job-level concurrency to avoid two workers promoting same slug simultaneously.
- Audit ledger is incremental by file content hash; historical outcomes retained even after a correction. Log every run and reason for skip/failure.
- Separate “recipes added” from “recipes independently verified” and “new book/page relationships established”.

## Content rights

We must not assume cookbook possession or public availability licenses reproducing expressive recipe directions or book artwork. Store source URLs and permitted display type; use ingredients, original metadata, a pointer to physical book/page, and/or outbound authorized recipe link when detailed text is not cleared.

## Future CI validations

- JSON schema validation on PRs and ingestion commits.
- Unique slugs, source URL syntax, nonempty title/author, numeric page only when evidence exists.
- Migrations tested against disposable Supabase/Postgres instance; private-data authorization tests.
- Metrics: candidates found, committed, skipped, merged, normalized, published, flagged; index coverage and cookbook attribution coverage.
