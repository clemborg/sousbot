import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getApiEnv } from '../config/env';

let pool: Pool | undefined;
let db: NodePgDatabase | undefined;

function ensurePool(): Pool {
  if (!pool) {
    const env = getApiEnv();
    pool = new Pool({
      connectionString: env.databaseUrl,
      max: env.isVercel ? 1 : 10,
      ssl: env.databaseUrl.includes('supabase') ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

export function getDb(): NodePgDatabase {
  if (!db) db = drizzle({ client: ensurePool() });
  return db;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
    db = undefined;
  }
}
