import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { userIdFromBearerOr401 } from '@/lib/auth/request-user';
import { getDb } from '@/lib/db/client';
import { userBooks } from '@/lib/db/schema';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

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
    .delete(userBooks)
    .where(and(eq(userBooks.id, id.data), eq(userBooks.userId, userId)))
    .returning({ id: userBooks.id });

  if (!deleted) {
    return Response.json({ error: 'Book not found on your shelf' }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
