import { Router } from 'express';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../db/client';
import { books, userBooks } from '../db/schema';
import { authRequired } from '../middleware/auth';

export const booksRouter = Router();

booksRouter.get('/books', async (_req, res) => {
  const rows = await getDb().select().from(books).orderBy(asc(books.title)).limit(500);
  res.json({ items: rows });
});

booksRouter.get('/me/books', ...authRequired, async (req, res) => {
  const rows = await getDb()
    .select({ id: userBooks.id, bookId: books.id, title: books.title })
    .from(userBooks)
    .innerJoin(books, eq(userBooks.bookId, books.id))
    .where(eq(userBooks.userId, req.userId!))
    .orderBy(asc(books.title));
  res.json({ items: rows });
});

booksRouter.post('/me/books', ...authRequired, async (req, res) => {
  const parsed = z.object({ bookId: z.string().uuid() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Invalid book ID' });
    return;
  }
  const [saved] = await getDb()
    .insert(userBooks)
    .values({ userId: req.userId!, bookId: parsed.data.bookId })
    .onConflictDoNothing({ target: [userBooks.userId, userBooks.bookId] })
    .returning();
  res.status(saved ? 201 : 200).json({ ok: true });
});

booksRouter.delete('/me/books/:id', ...authRequired, async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) {
    res.status(422).json({ error: 'Invalid ID' });
    return;
  }
  const [deleted] = await getDb()
    .delete(userBooks)
    .where(and(eq(userBooks.id, id.data), eq(userBooks.userId, req.userId!)))
    .returning({ id: userBooks.id });
  if (!deleted) {
    res.status(404).json({ error: 'Book not found on your shelf' });
    return;
  }
  res.status(204).send();
});
