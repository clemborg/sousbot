import { Router } from 'express';
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  cookingSessionInputSchema,
  cookingSessionPatchSchema,
  searchSchema,
} from '@sousbot/shared';
import { getDb } from '../db/client';
import {
  books,
  cookingSessions,
  recipeBookRefs,
  recipeIngredients,
  recipeSources,
  recipes,
} from '../db/schema';
import { authRequired, optionalAuth } from '../middleware/auth';
import { enrichRecipeSummaries } from '../services/recipe-enrichment';

export const recipesRouter = Router();

function escapeIlike(term: string) {
  return term.replace(/[%_\\]/g, m => '\\' + m);
}

function publishedTextMatch(q: string) {
  const pattern = '%' + escapeIlike(q) + '%';
  return or(
    ilike(recipes.title, pattern),
    sql`exists (select 1 from recipe_ingredients ri
      where ri.recipe_id = ${recipes.id}
      and (ri.normalized_name ilike ${pattern} or ri.raw_text ilike ${pattern}))`,
  );
}

recipesRouter.get('/recipes', optionalAuth, async (req, res) => {
  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(422).json({ error: 'Invalid search parameters', details: parsed.error.flatten() });
    return;
  }
  const { q, limit, myBooksOnly } = parsed.data;
  if (myBooksOnly && !req.userId) {
    res.status(401).json({ error: 'Sign in to filter by your cookbook shelf' });
    return;
  }

  let where = q
    ? and(eq(recipes.status, 'published'), publishedTextMatch(q))
    : eq(recipes.status, 'published');

  if (myBooksOnly && req.userId) {
    where = and(
      where,
      sql`exists (
        select 1 from recipe_book_refs rbr
        inner join user_books ub on ub.book_id = rbr.book_id
        where rbr.recipe_id = ${recipes.id}
          and ub.user_id = ${req.userId}
          and rbr.book_verified = true
      )`,
    );
  }

  const rows = await getDb()
    .select({ id: recipes.id, slug: recipes.slug, title: recipes.title, servings: recipes.servings })
    .from(recipes)
    .where(where)
    .orderBy(asc(recipes.title))
    .limit(limit);

  res.json({ items: await enrichRecipeSummaries(rows, req.userId), query: q, nextCursor: null });
});

recipesRouter.get('/recipes/:slug', optionalAuth, async (req, res) => {
  const [r] = await getDb()
    .select({
      id: recipes.id,
      slug: recipes.slug,
      title: recipes.title,
      servings: recipes.servings,
      directions: recipes.directions,
      displayPolicy: recipes.directionsDisplayPolicy,
    })
    .from(recipes)
    .where(and(eq(recipes.slug, String(req.params.slug)), eq(recipes.status, 'published')))
    .limit(1);
  if (!r) {
    res.status(404).json({ error: 'Recipe not found' });
    return;
  }
  const [summary] = await enrichRecipeSummaries(
    [{ id: r.id, slug: r.slug, title: r.title, servings: r.servings }],
    req.userId,
  );
  const [lines, sources, refs] = await Promise.all([
    getDb()
      .select({ raw: recipeIngredients.rawText })
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, r.id))
      .orderBy(asc(recipeIngredients.ordinal)),
    getDb().select({ url: recipeSources.url }).from(recipeSources).where(eq(recipeSources.recipeId, r.id)),
    getDb()
      .select({ title: books.title, page: recipeBookRefs.page, pageVerified: recipeBookRefs.pageVerified })
      .from(recipeBookRefs)
      .innerJoin(books, eq(books.id, recipeBookRefs.bookId))
      .where(and(eq(recipeBookRefs.recipeId, r.id), eq(recipeBookRefs.bookVerified, true))),
  ]);
  res.json({
    ...summary,
    ingredients: lines.map(x => x.raw),
    method: r.displayPolicy === 'authorized' ? r.directions : null,
    sources,
    books: refs.map(x => ({
      title: x.title,
      page: x.pageVerified ? x.page : null,
      verified: x.pageVerified,
    })),
  });
});

recipesRouter.get('/recipes/:slug/cooking-sessions', ...authRequired, async (req, res) => {
  const [r] = await getDb()
    .select({ id: recipes.id })
    .from(recipes)
    .where(and(eq(recipes.slug, String(req.params.slug)), eq(recipes.status, 'published')))
    .limit(1);
  if (!r) {
    res.status(404).json({ error: 'Recipe not found' });
    return;
  }
  const rows = await getDb()
    .select({
      id: cookingSessions.id,
      cookedOn: cookingSessions.cookedOn,
      notes: cookingSessions.notes,
      createdAt: cookingSessions.createdAt,
      updatedAt: cookingSessions.updatedAt,
    })
    .from(cookingSessions)
    .where(and(eq(cookingSessions.userId, req.userId!), eq(cookingSessions.recipeId, r.id)))
    .orderBy(desc(cookingSessions.cookedOn), desc(cookingSessions.createdAt));
  res.json({ items: rows });
});

recipesRouter.post('/recipes/:slug/cooking-sessions', ...authRequired, async (req, res) => {
  const parsed = cookingSessionInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Invalid cooking log', details: parsed.error.flatten() });
    return;
  }
  const [r] = await getDb()
    .select({ id: recipes.id })
    .from(recipes)
    .where(and(eq(recipes.slug, String(req.params.slug)), eq(recipes.status, 'published')))
    .limit(1);
  if (!r) {
    res.status(404).json({ error: 'Recipe not found' });
    return;
  }
  const [saved] = await getDb()
    .insert(cookingSessions)
    .values({
      userId: req.userId!,
      recipeId: r.id,
      cookedOn: parsed.data.cookedOn,
      notes: parsed.data.notes ?? null,
    })
    .returning();
  res.status(201).json(saved);
});

recipesRouter.patch('/me/cooking-sessions/:id', ...authRequired, async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  const input = cookingSessionPatchSchema.safeParse(req.body);
  if (!id.success || !input.success) {
    res.status(422).json({ error: 'Invalid update' });
    return;
  }
  const [updated] = await getDb()
    .update(cookingSessions)
    .set({ ...input.data, updatedAt: new Date() })
    .where(and(eq(cookingSessions.id, id.data), eq(cookingSessions.userId, req.userId!)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: 'Cooking entry not found' });
    return;
  }
  res.json(updated);
});

recipesRouter.delete('/me/cooking-sessions/:id', ...authRequired, async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) {
    res.status(422).json({ error: 'Invalid ID' });
    return;
  }
  const [deleted] = await getDb()
    .delete(cookingSessions)
    .where(and(eq(cookingSessions.id, id.data), eq(cookingSessions.userId, req.userId!)))
    .returning({ id: cookingSessions.id });
  if (!deleted) {
    res.status(404).json({ error: 'Cooking entry not found' });
    return;
  }
  res.status(204).send();
});
