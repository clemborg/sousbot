import { and, asc, eq, ilike, or, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { recipes } from '@/lib/db/schema';

export function escapeIlike(term: string) {
  return term.replace(/[%_\\]/g, m => '\\' + m);
}

export function publishedTextMatch(q: string) {
  const pattern = '%' + escapeIlike(q) + '%';
  return or(
    ilike(recipes.title, pattern),
    sql`exists (select 1 from recipe_ingredients ri
      where ri.recipe_id = ${recipes.id}
      and (ri.normalized_name ilike ${pattern} or ri.raw_text ilike ${pattern}))`,
  );
}

export async function findPublishedRecipes(params: {
  q: string;
  limit: number;
  myBooksOnly: boolean;
  userId?: string;
}) {
  const { q, limit, myBooksOnly, userId } = params;

  let where = q
    ? and(eq(recipes.status, 'published'), publishedTextMatch(q))
    : eq(recipes.status, 'published');

  if (myBooksOnly && userId) {
    where = and(
      where,
      sql`exists (
        select 1 from recipe_book_refs rbr
        inner join user_books ub on ub.book_id = rbr.book_id
        where rbr.recipe_id = ${recipes.id}
          and ub.user_id = ${userId}
      )`,
    );
  }

  return getDb()
    .select({ id: recipes.id, slug: recipes.slug, title: recipes.title, servings: recipes.servings })
    .from(recipes)
    .where(where)
    .orderBy(asc(recipes.title))
    .limit(limit);
}
