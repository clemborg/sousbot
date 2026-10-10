import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { userIdFromBearerOr401 } from '@/lib/auth/request-user';
import { getDb } from '@/lib/db/client';
import { books, userBooks } from '@/lib/db/schema';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const userOrRes = await userIdFromBearerOr401(request);
  if (userOrRes instanceof Response) return userOrRes;
  const userId = userOrRes;

  const rows = await getDb()
    .select({ id: userBooks.id, bookId: books.id, title: books.title })
    .from(userBooks)
    .innerJoin(books, eq(userBooks.bookId, books.id))
    .where(eq(userBooks.userId, userId))
    .orderBy(asc(books.title));

  return Response.json({ items: rows });
}

export async function POST(request: Request) {
  const userOrRes = await userIdFromBearerOr401(request);
  if (userOrRes instanceof Response) return userOrRes;
  const userId = userOrRes;

  const parsed = z.object({ bookId: z.string().uuid() }).safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: 'Invalid book ID' }, { status: 422 });
  }

  const [saved] = await getDb()
    .insert(userBooks)
    .values({ userId, bookId: parsed.data.bookId })
    .onConflictDoNothing({ target: [userBooks.userId, userBooks.bookId] })
    .returning();

  return Response.json({ ok: true }, { status: saved ? 201 : 200 });
}
