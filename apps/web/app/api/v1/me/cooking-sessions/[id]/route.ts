import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { cookingSessionPatchSchema } from '@sousbot/shared';
import { userIdFromBearerOr401 } from '@/lib/auth/request-user';
import { getDb } from '@/lib/db/client';
import { cookingSessions } from '@/lib/db/schema';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const userOrRes = await userIdFromBearerOr401(request);
  if (userOrRes instanceof Response) return userOrRes;
  const userId = userOrRes;
  const { id: rawId } = await params;

  const id = z.string().uuid().safeParse(rawId);
  const input = cookingSessionPatchSchema.safeParse(await request.json());
  if (!id.success || !input.success) {
    return Response.json({ error: 'Invalid update' }, { status: 422 });
  }

  const [updated] = await getDb()
    .update(cookingSessions)
    .set({ ...input.data, updatedAt: new Date() })
    .where(and(eq(cookingSessions.id, id.data), eq(cookingSessions.userId, userId)))
    .returning();

  if (!updated) {
    return Response.json({ error: 'Cooking entry not found' }, { status: 404 });
  }
  return Response.json(updated);
}

export async function DELETE(request: Request, { params }: Params) {
  const userOrRes = await userIdFromBearerOr401(request);
  if (userOrRes instanceof Response) return userOrRes;
  const userId = userOrRes;
  const { id: rawId } = await params;

  const id = z.string().uuid().safeParse(rawId);
  if (!id.success) {
    return Response.json({ error: 'Invalid ID' }, { status: 422 });
  }

  const [deleted] = await getDb()
    .delete(cookingSessions)
    .where(and(eq(cookingSessions.id, id.data), eq(cookingSessions.userId, userId)))
    .returning({ id: cookingSessions.id });

  if (!deleted) {
    return Response.json({ error: 'Cooking entry not found' }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
