import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { loadApiEnv } from '../config/env';

const env = loadApiEnv();

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: env.isVercel ? 1 : 10,
});

export const db = drizzle({ client: pool });
