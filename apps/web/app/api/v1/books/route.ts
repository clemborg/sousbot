import { asc } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { books } from '@/lib/db/schema';

export const runtime = 'nodejs';

export async function GET() {
  const rows = await getDb().select().from(books).orderBy(asc(books.title)).limit(500);
  return Response.json({ items: rows });
}
