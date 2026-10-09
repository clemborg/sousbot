# User flows and screen specifications

## IA (navigation)

**Discover | My Books | Saved (P1)**. Profile/sign-in in header. On mobile, Discover and My Books must remain one tap away; do not bury ingredient search.

## Discover — ingredient-led

```text
Sousbot                                      Sign in
What would you like to cook?
[  Brussels sprouts                 (x)  ]
[ Ingredient ] [ Recipe ]           optional mode, sensible automatic interpretation
-------------------------------------------------
Optional filters:  Author ▾  Book ▾  [ ] My books only
-------------------------------------------------
[Title]                 [Book / author]    [Open]
[Cooked twice · last: Sep 12 · "Needed more acid..."]
...
```

- One straightforward input; no required chip builder, pantry checklist or mandatory second term.
- Search accepts exact ingredient, common synonym, plural/spelling variant; display canonical ingredient label.
- Default scope: **all published recipes**, regardless of ownership.
- Prefer exact title or prominent ingredient match; incidental ingredient is lower rank.
- If term is ambiguous (e.g., “miso”), matching relevant ingredient aliases still works.
- Empty results: friendly message + clear search/reset; don't hallucinate recipes.
- Cards: name, author, cookbook if corroborated, verified page where possible, source availability, user's last-cooked summary (never global public notes).
- No forced log-in to browse; log-in required for personalized information.

## Recipe detail

```text
< Back to Discover
Brussels Sprouts with ...              [Cooked this]
By [author]
[Book title, edition, page if verified] [Visit published source]
[Ingredient list; servings/timing if present]
[Directions if licensed/authorized; otherwise read source/book]
-------------------------------------------------
Your cooking history (3)
Oct 4, 2026   "A touch less butter; roast longer." [Edit] [Delete]
Sep 12, 2026  "More lemon next time."             [Edit] [Delete]
Aug 20, 2026  "Followed exactly."                  [Edit] [Delete]
```

- Prominent cookbook reference; if multiple books, show each distinct verified association, edition/page.
- Author-verified does not imply cookbook-verified. If book unknown, show authorized online source without book claim.
- Data source warnings should be concise, not alarming; do not assert unverified times.

## Log cooking (P0)

Tap **Cooked this** → small dialog/drawer:
- Date: defaults to browser-local today in `YYYY-MM-DD`; editable for backdated cooks.
- Notes: optional multiline text, no minimum length.
- Save: inserts a **new immutable-in-identity** session, never overwrites prior cook sessions.
- On save: dismiss; update history and last-cooked card without a full page reload.
- Log entry allows editing its own cooked date and note, or deleting with confirmation.
- Show creation/edit metadata on request; distinguish `cooked_on` from `created_at`.

## My Books

- Search catalog of books by title and author, add/remove independently from other users.
- Book detail lists indexed recipes, verified pages per edition where available.
- “My books only” matches a book title even if user's edition is unknown, but only shows a specific page number when backed by the relevant edition or marked edition-uncertain.
- Owning a book is not a prerequisite for cooking or logging a recipe.

## Accessibility / responsive

- Mobile-first touch targets (>=44 CSS px where practical), semantic labels, keyboard input/search, focus trapping in log dialog, clear form errors, WCAG AA contrast target.
- Never use color alone to indicate cookbook verification.
- Dates in user's timezone; timestamps stored in UTC; avoid locale-dependent date parsing.
- Preserve Discover query/filter in URL so back navigation restores context.

## Instrumentation (privacy-conscious)

Track basic aggregate product outcomes if enabled: ingredient searches, recipe opens, cooking sessions created, “My books” filter usage. Avoid storing personal note text in telemetry.
