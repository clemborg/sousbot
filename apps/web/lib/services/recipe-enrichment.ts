import { and, desc, eq, inArray } from 'drizzle-orm';
import type { RecipeSummary } from '@sousbot/shared';
import { getDb } from '@/lib/db/client';
import {
  authors,
  books,
  cookingSessions,
  recipeAuthors,
  recipeBookRefs,
} from '@/lib/db/schema';

type CookInfo = RecipeSummary['cooking'];

export async function enrichRecipeSummaries(
  rows: { id: string; slug: string; title: string; servings: string | null }[],
  userId?: string,
): Promise<RecipeSummary[]> {
  if (!rows.length) return [];
  const ids = rows.map(r => r.id);
  const [authorRows, bookRows, cookRows] = await Promise.all([
    getDb()
      .select({ recipeId: recipeAuthors.recipeId, name: authors.name })
      .from(recipeAuthors)
      .innerJoin(authors, eq(recipeAuthors.authorId, authors.id))
      .where(inArray(recipeAuthors.recipeId, ids)),
    getDb()
      .select({
        recipeId: recipeBookRefs.recipeId,
        title: books.title,
        page: recipeBookRefs.page,
        pageVerified: recipeBookRefs.pageVerified,
      })
      .from(recipeBookRefs)
      .innerJoin(books, eq(recipeBookRefs.bookId, books.id))
      .where(and(inArray(recipeBookRefs.recipeId, ids), eq(recipeBookRefs.bookVerified, true))),
    userId
      ? getDb()
          .select({
            recipeId: cookingSessions.recipeId,
            cookedOn: cookingSessions.cookedOn,
            notes: cookingSessions.notes,
          })
          .from(cookingSessions)
          .where(and(eq(cookingSessions.userId, userId), inArray(cookingSessions.recipeId, ids)))
          .orderBy(desc(cookingSessions.cookedOn), desc(cookingSessions.createdAt))
      : Promise.resolve([]),
  ]);

  return rows.map(r => {
    const cooks = cookRows.filter(x => x.recipeId === r.id);
    const book = bookRows.find(x => x.recipeId === r.id);
    const cooking: CookInfo = userId
      ? {
          count: cooks.length,
          lastCookedOn: cooks[0]?.cookedOn ?? null,
          latestNote: cooks[0]?.notes ?? null,
        }
      : null;
    return {
      ...r,
      authors: authorRows.filter(x => x.recipeId === r.id).map(x => x.name),
      cookbook: book?.title ?? null,
      page: book?.pageVerified ? book.page : null,
      cooking,
    };
  });
}
