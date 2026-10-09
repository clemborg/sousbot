# REST API contract — draft v0.1

All routes prefixed `/api/v1`. JSON requests/responses; validated with shared Zod schemas. Route, parameter and DTO names are proposals, not implemented endpoints.

## Public catalog

| Method | Route | Semantics |
|---|---|---|
| GET | `/health` | API process/database connectivity status (minimal details). |
| GET | `/recipes?q=brussels%20sprouts&kind=ingredient&limit=20&cursor=...` | Ingredient-first discovery; `kind=auto\|ingredient\|title`, `bookId?`, `authorId?`, `myBooksOnly?`, `cooked?`. Personal filters only for signed-in users. |
| GET | `/recipes/:slug` | Published recipe with authors, raw ingredients, authorized method fields, online sources and supported cookbook references. |
| GET | `/ingredients/suggest?q=bruss` | Canonical term suggestions with common aliases. |
| GET | `/books?q=plenty` | Public book catalog, edition info, counts where indexed. |
| GET | `/books/:id/recipes` | Published recipes with proven book refs; edition-aware pages. |
| GET | `/authors?q=ottolenghi` | Public author catalog. |

`myBooksOnly=true` requires authentication; return 401 rather than silently searching all books.

Example search response:
```json
{
  "query": "brussels sprouts",
  "kind": "ingredient",
  "items": [
    {
      "id": "uuid",
      "slug": "ottolenghi-brussels-sprouts-burnt-butter-black-garlic",
      "title": "Brussels Sprouts with Burnt Butter and Black Garlic",
      "authors": ["Yotam Ottolenghi"],
      "book": { "title": "FLAVOUR", "page": null, "pageVerified": false },
      "match": { "canonicalIngredient": "Brussels sprouts", "importance": "primary" },
      "cooking": { "count": 2, "lastCookedOn": "2026-09-12", "latestNote": "More lemon next time" }
    }
  ],
  "nextCursor": null
}
```
**Illustrative payload only:** mock IDs/dates/book attribution and notes must not be treated as database facts. For anonymous visitors `cooking` is `null` (never somebody else's data). Don't include personal notes in shared caches.

## Authenticated personal endpoints

All `/me/*` routes require a valid Supabase Auth bearer JWT.

| Method | Route | Body / behavior |
|---|---|---|
| GET | `/me/books` | Current user's owned books. |
| POST | `/me/books` | `{bookId, editionId?}`; no `userId` accepted. |
| DELETE | `/me/books/:userBookId` | Delete own shelf membership only. |
| GET | `/recipes/:slug/cooking-sessions` | Only user's history, newest `cookedOn` first; never public timeline. |
| POST | `/recipes/:slug/cooking-sessions` | `{cookedOn: "YYYY-MM-DD", notes?: string, rating?: 1..5}`; creates new session. |
| PATCH | `/me/cooking-sessions/:id` | Partial update own event's date/notes/rating. |
| DELETE | `/me/cooking-sessions/:id` | Delete own event with explicit confirmation in UI. |
| GET | `/me/saved-recipes` | P1. |
| POST | `/me/saved-recipes` | P1. |
| DELETE | `/me/saved-recipes/:recipeId` | P1. |

`POST` cooking session **never upserts by recipe ID**; multiple sessions per recipe/user are expected.

## Example cooking log

Request:
```http
POST /api/v1/recipes/ottolenghi-brussels-sprouts-burnt-butter-black-garlic/cooking-sessions
Authorization: Bearer <Supabase access token>
Content-Type: application/json

{"cookedOn":"2026-10-09","notes":"Needed more acidity."}
```

Response `201 Created`:
```json
{
  "id": "generated-uuid",
  "recipeId": "uuid",
  "cookedOn": "2026-10-09",
  "notes": "Needed more acidity.",
  "rating": null,
  "createdAt": "2026-10-09T21:00:00Z",
  "updatedAt": "2026-10-09T21:00:00Z"
}
```

On malformed date/notes return `422`. On unauthorized `401`; on missing published recipe `404`; on someone else's cooking session `404` to avoid disclosing existence. Sanitize note rendering as plain text and apply length limit (proposed: 4,000 characters). Rate-limit writes.

## Search UX contract

- In normal usage each submitted ingredient term starts a **fresh search**, not a persistent multi-ingredient intersection.
- Preserve optional filters in query params and history; new term replaces old `q`.
- Return deterministic ranking + stable pagination.
- `myBooksOnly` means user's owned book titles; edition-specific page information shown only where edition provenance fits or uncertainty is indicated.
- Book not found ≠ recipe not found: online-only recipes are still included when no book filter is active.

## Validation / API tests

- Two signed-in users cannot GET/PATCH/DELETE each other's sessions or modify shelves.
- Unauthenticated catalog read returns no history or private notes.
- Repeating cooking POST creates two sessions (unless explicit idempotency key is supplied for retry dedupe; design later).
- Page references returned as `null` when not verified.
- Anonymous `myBooksOnly` query returns 401, not full catalog.
