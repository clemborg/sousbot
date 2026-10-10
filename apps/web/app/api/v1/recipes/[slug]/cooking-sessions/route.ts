import { and, desc, eq } from 'drizzle-orm';
import { cookingSessionInputSchema } from '@sousbot/shared';
import { userIdFromBearerOr401 } from '@/lib/auth/request-user';
import { getDb } from '@/lib/db/client';
import { cookingSessions, recipes } from '@/lib/db/schema';

export const runtime = 'nodejs';

type Params = { params: Promise<{ slug: string }> };

async function recipeIdForSlug(slug: string) {
  const [r] = await getDb()
    .select({ id: recipes.id })
    .from(recipes)
    .where(and(eq(recipes.slug, slug), eq(recipes.status, 'published')))
    .limit(1);
  return r?.id;
}

export async function GET(request: Request, { params }: Params) {
  const userOrRes = await userIdFromBearerOr401(request);
  if (userOrRes instanceof Response) return userOrRes;
  const userId = userOrRes;
  const { slug } = await params;
  const recipeId = await recipeIdForSlug(slug);
  if (!recipeId) {
    return Response.json({ error: 'Recipe not found' }, { status: 404 });
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
    .where(and(eq(cookingSessions.userId, userId), eq(cookingSessions.recipeId, recipeId)))
    .orderBy(desc(cookingSessions.cookedOn), desc(cookingSessions.createdAt));

  return Response.json({ items: rows });
}

export async function POST(request: Request, { params }: Params) {
  const userOrRes = await userIdFromBearerOr401(request);
  if (userOrRes instanceof Response) return userOrRes;
  const userId = userOrRes;
  const { slug } = await params;

  const parsed = cookingSessionInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: 'Invalid cooking log', details: parsed.error.flatten() }, { status: 422 });
  }

  const recipeId = await recipeIdForSlug(slug);
  if (!recipeId) {
    return Response.json({ error: 'Recipe not found' }, { status: 404 });
  }

  const [saved] = await getDb()
    .insert(cookingSessions)
    .values({
      userId,
      recipeId,
      cookedOn: parsed.data.cookedOn,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  return Response.json(saved, { status: 201 });
}
