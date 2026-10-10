import { sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database unavailable';
    return Response.json({ status: 'error', database: 'disconnected', message }, { status: 503 });
  }
}
