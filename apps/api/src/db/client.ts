import { createRequire } from 'node:module';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import { getApiEnv } from '../config/env';

const require = createRequire(import.meta.url);

let pool: Pool | undefined;
let db: NodePgDatabase | undefined;

function usesTls(databaseUrl: string): boolean {
  return (
    /supabase(\.co|\.com)|pooler\.supabase/i.test(databaseUrl) ||
    /[?&]sslmode=(require|verify-full|verify-ca|prefer)/i.test(databaseUrl)
  );
}

/** Supabase transaction pooler + pg v8+ SSL semantics on serverless. */
function connectionStringForRuntime(databaseUrl: string, isVercel: boolean): string {
  if (!isVercel) return databaseUrl;
  let url = databaseUrl;
  const hostAndPort = url.split('?')[0] ?? url;
  const usesTransactionPooler = /:6543(\/|$)/.test(hostAndPort);
  if (usesTransactionPooler && !/[?&]pgbouncer=/i.test(url)) {
    url += (url.includes('?') ? '&' : '?') + 'pgbouncer=true';
  }
  if (/[?&]sslmode=require/i.test(url) && !/[?&]uselibpqcompat=/i.test(url)) {
    url += (url.includes('?') ? '&' : '?') + 'uselibpqcompat=true';
  }
  return url;
}

function loadPgPool(): Pool {
  if (!pool) {
    const { Pool: PgPool } = require('pg') as typeof import('pg');
    const env = getApiEnv();
    const connectionString = connectionStringForRuntime(env.databaseUrl, env.isVercel);
    pool = new PgPool({
      connectionString,
      max: env.isVercel ? 1 : 10,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: env.isVercel ? 5_000 : 30_000,
      ssl: usesTls(connectionString) ? { rejectUnauthorized: false } : undefined,
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
