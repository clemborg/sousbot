import { createRequire } from 'node:module';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import { getApiEnv } from '../config/env';

const require = createRequire(import.meta.url);

let pool: Pool | undefined;
let db: NodePgDatabase | undefined;

function loadPgPool(): Pool {
  if (!pool) {
    const { Pool: PgPool } = require('pg') as typeof import('pg');
    const env = getApiEnv();
    pool = new PgPool({
      connectionString: env.databaseUrl,
      max: env.isVercel ? 1 : 10,
      ssl: env.databaseUrl.includes('supabase') ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

export function getDb(): NodePgDatabase {
  if (!db) db = drizzle({ client: loadPgPool() });
  return db;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
    db = undefined;
  }
}
