import { and, asc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import {
  books,
  recipeBookRefs,
  recipeIngredients,
  recipeSources,
  recipes,
} from '@/lib/db/schema';
import { optionalUserId } from '@/lib/auth/request-user';
import { enrichRecipeSummaries } from '@/lib/services/recipe-enrichment';

export const runtime = 'nodejs';

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;
  const userId = await optionalUserId(request);

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
    .where(and(eq(recipes.slug, slug), eq(recipes.status, 'published')))
    .limit(1);

  if (!r) {
    return Response.json({ error: 'Recipe not found' }, { status: 404 });
  }

  const [summary] = await enrichRecipeSummaries(
    [{ id: r.id, slug: r.slug, title: r.title, servings: r.servings }],
    userId,
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

  return Response.json({
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
}
