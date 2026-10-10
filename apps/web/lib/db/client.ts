import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getServerEnv } from '@/lib/env';

let pool: Pool | undefined;
let db: NodePgDatabase | undefined;

function usesTls(databaseUrl: string): boolean {
  return (
    /supabase(\.co|\.com)|pooler\.supabase/i.test(databaseUrl) ||
    /[?&]sslmode=(require|verify-full|verify-ca|prefer)/i.test(databaseUrl)
  );
}

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
    const env = getServerEnv();
    const connectionString = connectionStringForRuntime(env.databaseUrl, env.isVercel);
    pool = new Pool({
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
