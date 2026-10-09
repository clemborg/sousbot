# Relational data model — v0.1 proposal

This is a design specification, **not an applied migration**. PostgreSQL/Supabase is the operational data store; GitHub JSON and audit files are provenance/archive.

## Catalog tables

| Table | Required columns | Notes |
|---|---|---|
| `authors` | `id uuid pk`, `name`, `slug unique` | Independent of cookbook links. |
| `recipes` | `id uuid pk`, `slug unique`, `title`, `summary?`, `servings_text?`, `prep_minutes?`, `cook_minutes?`, `publication_status`, `directions_display_policy`, `created_at`, `updated_at` | One canonical dish/variant per record; statuses draft/source_checked/published/flagged/archived. Do not flatten cookbook affiliation into recipe. |
| `recipe_authors` | `recipe_id fk`, `author_id fk`, `ordinal` | Supports co-authored recipes. |
| `ingredients` | `id uuid pk`, `canonical_name`, `slug unique`, `parent_id?` | “Miso” can be a parent to white/red miso; recipe ingredient stays specific. |
| `ingredient_aliases` | `id uuid pk`, `ingredient_id fk`, `alias`, `normalized_alias` | Unique normalized alias where not ambiguous; eggplant↔aubergine; singular/plural. |
| `recipe_ingredients` | `id uuid pk`, `recipe_id fk`, `ingredient_id? fk`, `ordinal`, `raw_text`, `quantity_numeric?`, `unit?`, `preparation?`, `importance`, `is_optional` | **Always preserve raw original ingredient line.** Ingredient normalization is incremental; unsupported quantities remain null, not zero. |
| `books` | `id uuid pk`, `title`, `slug unique`, `publisher?`, `cover_asset_id?` | Same work across editions. |
| `book_authors` | `book_id fk`, `author_id fk`, `ordinal` | Book authors distinct from recipe authors. |
| `book_editions` | `id uuid pk`, `book_id fk`, `isbn_13? unique`, `publication_year?`, `edition_label?`, `publisher?` | An unrecognized/unspecified edition should not be silently equated with first edition. |
| `recipe_book_refs` | `id uuid pk`, `recipe_id fk`, `book_id fk`, `edition_id? fk`, `page_start?`, `page_end?`, `verification_status`, `evidence_source_id?` | Multiple books/editions per dish. Page may be null. Verify edition belongs to referenced book. Distinguish verified book from verified page. |
| `recipe_sources` | `id uuid pk`, `recipe_id fk`, `url`, `source_type`, `checked_at?`, `verification_status`, `display_rights` | Supports published online links, indexes, publisher excerpts, reviewer notes. Preserve source evidence. |
| `recipe_categories` | `recipe_id fk`, `category_id fk` | Optional later; do not invent cuisine/time metadata. |

## User tables

| Table | Required columns | Notes |
|---|---|---|
| `profiles` | `id uuid pk fk auth.users`, `display_name?`, `timezone`, `created_at` | Default timezone selectable, initialized from browser when user consents. |
| `user_books` | `id uuid pk`, `user_id fk`, `book_id fk`, `edition_id? fk`, `created_at` | One user's shelf; ownership works without edition. Validate edition/book match. |
| `cooking_sessions` | `id uuid pk`, `user_id fk`, `recipe_id fk`, `cooked_on date`, `notes text?`, `rating smallint?`, `created_at timestamptz`, `updated_at timestamptz` | **Every click on Save creates a separate row**. Date defaults from browser-local date but is user-editable; preserve actual server creation time. |
| `user_recipe_notes` | `id uuid pk`, `user_id fk`, `recipe_id fk`, `body`, `created_at`, `updated_at` | P1 general notes not linked to a cooking occasion. |
| `user_saved_recipes` | `user_id fk`, `recipe_id fk`, `created_at`; composite unique | P1; each person's own bookmarks. |

## Research / publishing tables

| Table | Main fields | Rules |
|---|---|---|
| `ingestion_runs` | `id`, `started_at`, `finished_at?`, `status`, `counts jsonb`, `source_commit?` | One run id; no false success when GitHub writes fail. |
| `imported_recipe_records` | `id`, `origin_repo`, `origin_path`, `origin_sha`, `recipe_id?`, `import_status`, `raw_payload jsonb` | UNIQUE (`origin_repo`,`origin_path`,`origin_sha`) for reproducible imports; changed SHA triggers new import review. |
| `recipe_audits` | `id`, `recipe_id`, `reviewed_at`, `recipe_revision_hash`, `outcome`, `evidence jsonb`, `issues jsonb` | Preserve entire history, not only current status. |
| `recipe_issues` | `id`, `recipe_id`, `code`, `severity`, `status`, `created_at` | Track missing cookbook/page, discrepancies, duplicate candidates. |

## Key constraints

- All PKs UUID, timestamps `timestamptz` in UTC, cooking event `cooked_on` is a **date** independent from creation timestamp.
- `cooking_sessions.user_id` is derived from verified JWT; UPDATE/DELETE only where `id` AND `user_id` match. User rows have RLS policies for ownership.
- `recipe_book_refs` cannot set `page_verified` without a corroborated edition and evidence; no fabricated `0` pages. A verified book association is allowed with null page.
- Avoid unique constraint on (`recipe_id`,`book_id`) because a recipe can appear in multiple editions. Apply deliberate uniqueness rules for editions/unknown-edition refs at migration time.
- Handle canonical recipe merges through explicit merge mapping (legacy slug → canonical ID) and maintain traceability. “Basic Tomato Sauce” variants may be distinct; do not auto-merge on title.
- Only `published` recipes enter public search. Audit/ingestion can update staging asynchronously without exposing drafts.
- Prevent duplicate private shelf rows for same user/book/edition; decide whether multiple physical copies of same edition are in scope (not MVP).

## Search model

1. Normalize user term (case, whitespace, conservative singular/plural, accent-folding as appropriate).
2. Match `ingredient_aliases.normalized_alias` and `ingredients.slug`, including parent-child specificity where explicitly modeled.
3. Find `recipe_ingredients` using matched canonical ingredient IDs. Rank `primary` > `supporting` > `garnish`.
4. Also search recipe title via PostgreSQL FTS/trigram for dish queries.
5. Filter status=`published`; apply optional `book_id`/author and optional `user_books` EXISTS clause using authenticated `user_id`.
6. Return bounded, stable keyset/page results with user-specific `cooked_count`, `last_cooked_on`, `latest_cooking_note` computed only for signed-in user.

Ingredient names in imported legacy JSON are free text; normalized ingredient mapping must preserve unmatched lines and report coverage. No LLM on the interactive search hot path.
