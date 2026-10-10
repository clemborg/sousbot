import { searchSchema } from '@sousbot/shared';
import { optionalUserId } from '@/lib/auth/request-user';
import { enrichRecipeSummaries } from '@/lib/services/recipe-enrichment';
import { findPublishedRecipes } from '@/lib/recipes/search';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = searchSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid search parameters', details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const { q, limit, myBooksOnly } = parsed.data;
  const userId = await optionalUserId(request);
  if (myBooksOnly && !userId) {
    return Response.json({ error: 'Sign in to filter by your cookbook shelf' }, { status: 401 });
  }

  const rows = await findPublishedRecipes({
    q,
    limit,
    myBooksOnly: Boolean(myBooksOnly),
    userId,
  });

  return Response.json({
    items: await enrichRecipeSummaries(rows, userId),
    query: q,
    nextCursor: null,
  });
}
