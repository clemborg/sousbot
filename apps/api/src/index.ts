import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  searchSchema, cookingSessionInputSchema, cookingSessionPatchSchema,
  type RecipeSummary,
} from '@sousbot/shared';
import {
  authors, books, cookingSessions, recipeAuthors, recipeBookRefs,
  recipeIngredients, recipes, recipeSources, userBooks,
} from './db/schema';

declare global {
  namespace Express { interface Request { userId?: string } }
}

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!DATABASE_URL || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Configure DATABASE_URL, SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in apps/api/.env');
}
// On Vercel each warm function instance has its own pool; keep it small.
const pool = new Pool({ connectionString: DATABASE_URL, max: process.env.VERCEL ? 1 : 10 });
const db = drizzle({ client: pool });
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const app = express();
app.use(cors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json({ limit: '32kb' }));

async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const h = req.header('authorization');
  if (!h) return next();
  if (!h.startsWith('Bearer ')) { res.status(401).json({ error: 'Invalid authorization header' }); return; }
  try {
    const { data, error } = await supabase.auth.getUser(h.slice(7));
    if (error || !data.user) { res.status(401).json({ error: 'Invalid or expired session' }); return; }
    req.userId = data.user.id;
    next();
  } catch (err) { next(err); }
}
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.userId) { res.status(401).json({ error: 'Sign in to save your cooking history' }); return; }
  next();
}
const authRequired = [optionalAuth, requireAuth];
const recipeFilter = (q: string) => {
  const term = q.replace(/[%_\\]/g, m => '\\' + m);
  const pattern = '%' + term + '%';
  return q ? and(
    eq(recipes.status, 'published'),
    or(
      ilike(recipes.title, pattern),
      sql`exists (select 1 from recipe_ingredients ri
        where ri.recipe_id = ${recipes.id}
        and (ri.normalized_name ilike ${pattern} or ri.raw_text ilike ${pattern}))`,
    ),
  ) : eq(recipes.status, 'published');
};
type CookInfo = RecipeSummary['cooking'];
async function enrich(rows: { id: string; slug: string; title: string; servings: string | null }[], userId?: string): Promise<RecipeSummary[]> {
  if (!rows.length) return [];
  const ids = rows.map(r => r.id);
  const [a, b, c] = await Promise.all([
    db.select({ recipeId: recipeAuthors.recipeId, name: authors.name })
      .from(recipeAuthors).innerJoin(authors, eq(recipeAuthors.authorId, authors.id))
      .where(inArray(recipeAuthors.recipeId, ids)),
    db.select({ recipeId: recipeBookRefs.recipeId, title: books.title, page: recipeBookRefs.page, pageVerified: recipeBookRefs.pageVerified })
      .from(recipeBookRefs).innerJoin(books, eq(recipeBookRefs.bookId, books.id))
      .where(and(inArray(recipeBookRefs.recipeId, ids), eq(recipeBookRefs.bookVerified, true))),
    userId ? db.select({ recipeId: cookingSessions.recipeId, cookedOn: cookingSessions.cookedOn, notes: cookingSessions.notes })
      .from(cookingSessions).where(and(eq(cookingSessions.userId, userId), inArray(cookingSessions.recipeId, ids)))
      .orderBy(desc(cookingSessions.cookedOn), desc(cookingSessions.createdAt)) : Promise.resolve([]),
  ]);
  return rows.map(r => {
    const cr = c.filter(x => x.recipeId === r.id);
    const br = b.find(x => x.recipeId === r.id);
    const cooking: CookInfo = userId ? { count: cr.length, lastCookedOn: cr[0]?.cookedOn ?? null, latestNote: cr[0]?.notes ?? null } : null;
    return { ...r, authors: a.filter(x => x.recipeId === r.id).map(x => x.name), cookbook: br?.title ?? null,
      page: br?.pageVerified ? br.page : null, cooking };
  });
}

app.get('/api/v1/health', async (_req, res) => {
  await db.execute(sql`select 1`);
  res.json({ status: 'ok', database: 'connected' });
});

app.get('/api/v1/recipes', optionalAuth, async (req, res) => {
  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) { res.status(422).json({ error: 'Invalid search parameters', details: parsed.error.flatten() }); return; }
  const { q, limit } = parsed.data;
  const rows = await db.select({ id: recipes.id, slug: recipes.slug, title: recipes.title, servings: recipes.servings })
    .from(recipes).where(recipeFilter(q)).orderBy(asc(recipes.title)).limit(limit);
  res.json({ items: await enrich(rows, req.userId), query: q, nextCursor: null });
});

app.get('/api/v1/recipes/:slug', optionalAuth, async (req, res) => {
  const [r] = await db.select({ id: recipes.id, slug: recipes.slug, title: recipes.title,
    servings: recipes.servings, directions: recipes.directions, displayPolicy: recipes.directionsDisplayPolicy })
    .from(recipes).where(and(eq(recipes.slug, String(req.params.slug)), eq(recipes.status, 'published'))).limit(1);
  if (!r) { res.status(404).json({ error: 'Recipe not found' }); return; }
  const [summary] = await enrich([{ id: r.id, slug: r.slug, title: r.title, servings: r.servings }], req.userId);
  const [lines, sources, refs] = await Promise.all([
    db.select({ raw: recipeIngredients.rawText }).from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, r.id)).orderBy(asc(recipeIngredients.ordinal)),
    db.select({ url: recipeSources.url }).from(recipeSources).where(eq(recipeSources.recipeId, r.id)),
    db.select({ title: books.title, page: recipeBookRefs.page, pageVerified: recipeBookRefs.pageVerified })
      .from(recipeBookRefs).innerJoin(books, eq(books.id, recipeBookRefs.bookId))
      .where(and(eq(recipeBookRefs.recipeId, r.id), eq(recipeBookRefs.bookVerified, true))),
  ]);
  res.json({ ...summary, ingredients: lines.map(x => x.raw),
    method: r.displayPolicy === 'authorized' ? r.directions : null,
    sources, books: refs.map(x => ({ title: x.title, page: x.pageVerified ? x.page : null, verified: x.pageVerified })) });
});

app.get('/api/v1/recipes/:slug/cooking-sessions', ...authRequired, async (req, res) => {
  const [r] = await db.select({ id: recipes.id }).from(recipes)
    .where(and(eq(recipes.slug, String(req.params.slug)), eq(recipes.status, 'published'))).limit(1);
  if (!r) { res.status(404).json({ error: 'Recipe not found' }); return; }
  const rows = await db.select({ id: cookingSessions.id, cookedOn: cookingSessions.cookedOn,
    notes: cookingSessions.notes, createdAt: cookingSessions.createdAt, updatedAt: cookingSessions.updatedAt })
    .from(cookingSessions).where(and(eq(cookingSessions.userId, req.userId!), eq(cookingSessions.recipeId, r.id)))
    .orderBy(desc(cookingSessions.cookedOn), desc(cookingSessions.createdAt));
  res.json({ items: rows });
});

app.post('/api/v1/recipes/:slug/cooking-sessions', ...authRequired, async (req, res) => {
  const parsed = cookingSessionInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: 'Invalid cooking log', details: parsed.error.flatten() }); return; }
  const [r] = await db.select({ id: recipes.id }).from(recipes)
    .where(and(eq(recipes.slug, String(req.params.slug)), eq(recipes.status, 'published'))).limit(1);
  if (!r) { res.status(404).json({ error: 'Recipe not found' }); return; }
  const [saved] = await db.insert(cookingSessions).values({
    userId: req.userId!, recipeId: r.id, cookedOn: parsed.data.cookedOn, notes: parsed.data.notes ?? null,
  }).returning();
  res.status(201).json(saved);
});

app.patch('/api/v1/me/cooking-sessions/:id', ...authRequired, async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  const input = cookingSessionPatchSchema.safeParse(req.body);
  if (!id.success || !input.success) { res.status(422).json({ error: 'Invalid update' }); return; }
  const [updated] = await db.update(cookingSessions).set({ ...input.data, updatedAt: new Date() })
    .where(and(eq(cookingSessions.id, id.data), eq(cookingSessions.userId, req.userId!))).returning();
  if (!updated) { res.status(404).json({ error: 'Cooking entry not found' }); return; }
  res.json(updated);
});

app.delete('/api/v1/me/cooking-sessions/:id', ...authRequired, async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) { res.status(422).json({ error: 'Invalid ID' }); return; }
  const [deleted] = await db.delete(cookingSessions)
    .where(and(eq(cookingSessions.id, id.data), eq(cookingSessions.userId, req.userId!)))
    .returning({ id: cookingSessions.id });
  if (!deleted) { res.status(404).json({ error: 'Cooking entry not found' }); return; }
  res.status(204).send();
});

app.get('/api/v1/books', async (_req, res) => {
  const rows = await db.select().from(books).orderBy(asc(books.title)).limit(500);
  res.json({ items: rows });
});

app.get('/api/v1/me/books', ...authRequired, async (req, res) => {
  const rows = await db.select({ id: userBooks.id, bookId: books.id, title: books.title })
    .from(userBooks).innerJoin(books, eq(userBooks.bookId, books.id))
    .where(eq(userBooks.userId, req.userId!)).orderBy(asc(books.title));
  res.json({ items: rows });
});

app.post('/api/v1/me/books', ...authRequired, async (req, res) => {
  const parsed = z.object({ bookId: z.string().uuid() }).safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: 'Invalid book ID' }); return; }
  const [saved] = await db.insert(userBooks).values({ userId: req.userId!, bookId: parsed.data.bookId })
    .onConflictDoNothing({ target: [userBooks.userId, userBooks.bookId] }).returning();
  res.status(saved ? 201 : 200).json({ ok: true });
});

app.delete('/api/v1/me/books/:id', ...authRequired, async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) { res.status(422).json({ error: 'Invalid ID' }); return; }
  const [deleted] = await db.delete(userBooks).where(and(eq(userBooks.id, id.data), eq(userBooks.userId, req.userId!)))
    .returning({ id: userBooks.id });
  if (!deleted) { res.status(404).json({ error: 'Book not found on your shelf' }); return; }
  res.status(204).send();
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled API error', err instanceof Error ? err.message : 'Unknown error');
  res.status(500).json({ error: 'Internal server error' });
});

// Vercel runs the exported Express app as a Function; local Node runs a listener.
export default app;
if (!process.env.VERCEL) {
  const port = Number(process.env.PORT ?? 4000);
  app.listen(port, () => console.log('Sousbot API listening on port ' + port));
  process.on('SIGTERM', async () => { await pool.end(); process.exit(0); });
}
