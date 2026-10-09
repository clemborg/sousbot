# Sousbot — approved visual direction and UI scope

**Status:** visual direction approved in conversation 2026-10-09; implementation is scoped, **not yet built to match the design**.  
**Reference:** The approved concept board is the warm illustrated desktop/mobile layout with landing, search results, recipe detail, cooking history, personal cookbooks, and a token/illustration guide. The image was generated in the design conversation; this document preserves its design decisions in the repo, not the original PNG asset.

## 1. Design intent

**Warm, illustrated, calm, editorial, inviting.** The user preferred the warmth of the photographic concept but **rejected the photorealism**, and chose the visual aesthetic of the light illustrated concept. Use botanical and culinary drawings as decoration while keeping real recipe discovery fast and practical. The product should feel like opening a thoughtful cookbook, not a generic AI dashboard.

**Do:** natural off-white backgrounds, deep sage actions, elegant black serif headlines, restrained fine-line icons, gently textured botanical illustration, uncluttered search, human-scale content and prominent cooking journal.

**Avoid:** full-bleed hyperreal food photography as the visual foundation; dark/black dramatic themes; glossy synthetic stock art; bright saturated gradients; card-heavy enterprise UI; excessive shadows, glassmorphism or animation; AI chat as the primary entry point.

## 2. Design tokens (proposed, subject to browser contrast testing)

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#FAF7EF` | Cream app background |
| `--color-surface` | `#FFFFFF` | Search fields, panels, cards |
| `--color-sage` | `#2F5233` | Primary CTA, selected nav, important accents |
| `--color-sage-light` | `#E5EEDC` | Tags, secondary backgrounds |
| `--color-ink` | `#1B1B1B` | Headings and primary body text |
| `--color-muted` | `#6B6B6B` | Secondary text |
| `--color-gold` | `#C6A96B` | Subtle decorative accents, rating stars |
| `--color-gold-light` | `#F3E6CB` | Warm surfaces |
| `--color-error` | `#C35B5B` | Error feedback; test on chosen background |
| `--font-display` | Fraunces, Georgia, serif | Editorial headlines and recipe names |
| `--font-body` | Inter, system-ui, sans-serif | Inputs, metadata, navigation and notes |
| `--radius-control` | 12px | Inputs/buttons |
| `--radius-card` | 14px | Panels and recipe cards |
| `--space-unit` | 4px | Spacing scale, 4–64px |

Font choices are **design proposals**, not fonts already installed or committed as assets. Do not bundle font files unless their licensing permits it. Use accessible contrast for muted text, gold on cream and selected controls; color must not be the only status indicator.

## 3. Illustration art direction

- Hand-painted botanical ingredients: leafy greens, citrus, eggplant, herbs, mushrooms, olive oil, artichokes.
- Muted sage, olive, ochre, terracotta and natural food colors; ink/colored-pencil outlines and lightly imperfect watercolor fills.
- Landing desktop: illustrated still life on right; headline and search on left. Mobile: smaller illustration below or around search, never obstructing it.
- Recipe photography **may be used** where there are genuine, appropriately licensed recipe images; no requirement to generate fake photographs for each catalog item. Default to illustration/typographic placeholder if no licensed image.
- Book covers only where authorized/legitimately sourced. Do not fabricate book cover artwork or imply a false edition.
- Assets: optimized WebP/AVIF/SVG/PNG, descriptive alt text for informative images, empty alt for decorative art, responsive dimensions, no layout shift.

## 4. Screens and behavior

### A. Landing (desktop)

- Thin top navigation: Sousbot, Recipes, Cookbooks, About, Sign in / Sign up.
- Main heading **“Find what to cook.”**
- Supporting copy: **“Search ingredients, explore recipes from the world's best cookbooks, and keep track of what you cook.”** (marketing copy, not a guarantee of licensing or completeness).
- Search: prominent rounded input with search icon and placeholder “What would you like to cook?”; Enter submits, search button optional.
- Ingredient chips: Brussels sprouts, Miso, Chicken, Mushrooms, Pasta; **each chip initiates an independent search**, never silently appending to an earlier ingredient.
- Right-side botanical ingredient illustration. Four-feature band: Great cookbooks; Ingredient search; Your cooking history; Simple and focused.
- Mobile: stacked layout, appropriately sized hero, horizontal/wrapping chips, accessible navigation and input.

### B. Search results

- Header retains search query and offers a clear action.
- List or responsive grid of published recipe results, title/author, optional legitimate image, duration/difficulty **only if data exists**, and cookbook attribution **only if verified**.
- Filter tabs proposed: All, My Cookbooks, Vegetarian, Quick; **only activate filters backed by real fields/query logic**. My Cookbooks filter must be explicitly chosen; never default to owned-only.
- Show actual result count only when returned by API; current backend caps list to 20 and has no total count. No fabricated “42 recipes.”
- Sort by relevance where supported; do not label alphabetical results “Most relevant.”
- Loading, zero results, offline/server errors and unauthenticated behavior.

### C. Recipe detail

- Clear recipe title and author; cookbook name/page if verified for an edition.
- Ingredients and legally displayable method; otherwise direct user to the published source or physical cookbook.
- A prominent **“Cooked this”** CTA and separate Save action (Save is future unless backed by persistence).
- Tabs/sections: Ingredients, Method, Notes, Cookbook. Accessible tabs or headings; no inaccessible hidden content.
- No invented prep time, difficulty, servings, photos, cookbook pages or attribution.

### D. Cooking history and note-taking

- Primary action “Cooked this” opens a lightweight date-and-notes form.
- Date defaults to user's **local** current date, user can backdate; each cooking occasion is a separate persisted record.
- Notes are optional, dated automatically; chronological history appears on recipe and dedicated History view.
- Editing/deleting affects only the selected cooking session owned by authenticated user.
- Rating stars are present in the concept art but **not yet in schema/API**. Treat as proposed P1 enhancement until added end-to-end; no misleading interactive stars.
- History is private by default; never surface a user's personal notes to other users or anonymous visitors.
- General recipe notes separate from occasion notes is a possible later extension; do not conflate the two in storage.

### E. My Cookbooks

- Grid of books the user owns with cover where permitted and a restrained typographic placeholder otherwise.
- Add/remove book; later edition selection, author grouping, and book detail with verified linked recipes.
- Search remains open to **all** published recipes unless user opts into “My Cookbooks only.”

### F. Mobile navigation

- Bottom nav suggested: Home, Recipes, Cookbooks, Saved, History. If Saved isn't implemented, omit/disable with clear explanation rather than shipping a dead button.
- Provide touch targets at least ~44px and avoid relying on hover.
- Navigation state should be reflected in route URLs when real routing is added; browser Back should work.

## 5. React implementation map

| Layer | Components / modules | Notes |
|---|---|---|
| Theme | `src/styles/tokens.css`, `src/styles/global.css` | Shared tokens, typography, focus and spacing |
| Shell | `AppShell`, `TopNav`, `MobileNav` | Responsive nav and authenticated state |
| Home | `LandingHero`, `IngredientSearch`, `IngredientChips`, `FeatureStrip` | Independent search semantics |
| Discover | `RecipeResults`, `RecipeCard`, `RecipeFilters` | Honest metadata and states |
| Detail | `RecipeHeader`, `RecipeTabs`, `IngredientList`, `CookLogDialog` | Provenance and journal |
| History | `CookingHistory`, `CookingEntry`, `CookingEntryForm` | Owner-only CRUD |
| Library | `CookbookGrid`, `CookbookCard`, `BookShelfActions` | Real data and fallbacks |
| UI | `Button`, `Input`, `Chip`, `Dialog`, `EmptyState` | Keyboard accessible, tested |

**Existing scaffold:** `apps/web/src/App.tsx` and `styles.css` are monolithic starter implementations with some overlapping flows, not a realization of this visual system. Incrementally refactor into reusable components rather than replacing working API integration with a static mockup.

## 6. Build sequence

1. **Tokens and responsive shell** — implement typography, colors, nav, controls, layout; match design with placeholder/optimized illustrations.
2. **Landing + search** — ingredient-first desktop/mobile hero, independent chips, real API results and error states.
3. **Recipe detail + notes** — rich layout, reliable dated log creation/edit/history and user-specific privacy.
4. **Cookbook shelf** — card grid with safe cover fallback, real ownership and optional book-only filtering.
5. **Polish** — mobile screenshots, contrast, keyboard, reduced-motion, loading and empty states, performance.

## 7. Definition of done for design milestone

- [ ] 375px, 768px, 1440px layouts visually consistent with warm illustrated reference.
- [ ] Illustrations are properly sourced/generated, stored as optimized repo assets and used in production build.
- [ ] Search chips are independent queries; no forced ingredient-combination behavior.
- [ ] Recipe metadata is truthful and provenance/rights policies preserved.
- [ ] Notes show dates and previous cooking occasions; API persists user-specific data.
- [ ] Interactive controls are implemented, not decorative dead ends.
- [ ] Basic accessibility checks: keyboard, focus, labels, contrast, modal focus, reduced motion.
- [ ] Build and typecheck pass in GitHub Actions and in Vercel preview.

## Tracked issues

- [#6 — visual tokens and component system](https://github.com/clemborg/sousbot/issues/6)
- [#7 — landing and ingredient search](https://github.com/clemborg/sousbot/issues/7)
- [#8 — recipe detail and cooking journal](https://github.com/clemborg/sousbot/issues/8)
- [#9 — personal cookbook library](https://github.com/clemborg/sousbot/issues/9)

**Visual source of truth:** approved warm illustrated concept from this chat, 2026-10-09. The source PNG is available in the conversation, **not yet checked into the GitHub repo**. This written contract is committed so development can proceed without the image file.
