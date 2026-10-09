# Product requirements — MVP v0.1

**Product promise:** “I feel like cooking with Brussels sprouts. Show me something appealing, ideally from a cookbook I own; when I cook it, remember what I did.”

## Target users

- An enthusiastic home cook who likes cooking but dislikes choosing a dish; starts with **one ingredient** and browses.
- A cookbook owner who wants to use books they already have; searches across books and can optionally constrain results to owned editions/titles.
- A returning cook who wants a date-stamped record of previous attempts and small adjustments.
- Multiple independent users (e.g., members of one family); shared catalog, private personal data.

## P0 — first usable release

1. **Discover:** search by a single ingredient term or dish/title term with autocomplete where available; trim/casefold common aliases (e.g., aubergine/eggplant). Show catalog-wide results by default; relevance prioritizes title and salient ingredients. Pagination, sensible empty/loading/error states. No AI required.
2. **Explore:** optional author, book, “My books only”, and previously cooked filters. Unverified book links must not masquerade as exact page references.
3. **Recipe detail:** title, author(s), ingredient list, servings/timing only where known, source link(s), cookbook title and **verified** page/edition where available. Show directions only when the app has a legitimate basis for presenting them; support “Open source” / “Find in book” as fallback.
4. **Cooking log:** prominent **Cooked this** action. On open, date defaults to user's **local today**; optional free-text notes and optional rating (rating can wait until P1). Save in one submission. Timeline newest-first; edit date/note and delete own logs.
5. **Historical context:** search/result card shows “Cooked N times”, last cooked date, and abbreviated latest note **for the logged-in user only**. Recipe detail shows all prior occasions; never mix users' notes.
6. **Accounts:** sign up/sign in/sign out with Supabase Auth; anonymous users may browse publicly published recipes, but must sign in to manage books and logs.
7. **My Books:** browse public cookbook catalog, add/remove a title (and edition if known), see recipes in owned books and filter Explore by owned books.
8. **Release gate:** only publish recipes meeting documented minimum source and data-quality rules. Exclude drafts from public queries; show uncertainty honestly.

## P1 after initial usability test

- Saved/bookmarked recipes; general undated-in-meaning notes (their records still track created/updated timestamps).
- Personal ratings / favorites, recent searches, quality indicators.
- Better filters (course, cuisine, time) when underlying values are sufficiently populated.
- Mobile-friendly print/share link and photo attachments where user-supplied and licensed.

## Explicit non-goals for MVP

- Pantry inventory, grocery-list generation, compulsory combination of multiple ingredients, ingredient-substitution engine, AI conversational assistant, meal calendar, social feed.
- A catalog of all recipes in every published cookbook.
- Copying paywalled or copyrighted cookbook instructions into a public app without permission.
- Importing unverifiable ingredient measures, asserting page numbers by guesswork, or automatic publication of every AI extraction.

## Success criteria / acceptance

- A user searches **one** ingredient like “miso”, gets relevant titles from across all catalog recipes, and can open a result without owning a book.
- Searching “brussels sprouts” is independent of the prior “miso” search; no accidental AND filter persists.
- With “My books only” on, search results contain only recipes tied to a user-owned book; turning off returns the full published catalog.
- A user logs a cook in <= 2 deliberate actions after opening the recipe (open dialog and save), assuming zero or minimal note entry; date defaults locally and is editable.
- A second account cannot see/change first account's cooking sessions, notes, shelves or bookmarks.
- Returning to a recipe surfaces three separate cooking occasions (with different notes/dates), not a single overwritten recipe note.
- A recipe without established book/page remains searchable but displays “Book reference not verified” rather than a fabricated page number.

## Questions deliberately deferred

- Brand identity and high-fidelity visual system.
- Whether a rating is included in first release (the log schema supports optional rating).
- Whether explicit author recipe photos are licensed/available.
- Hosting targets (choose before building deployment workflow), ISBN/provider for cover images, search analytics.
