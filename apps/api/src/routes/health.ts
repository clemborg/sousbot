import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { getDb } from '../db/client';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  await getDb().execute(sql`select 1`);
  res.json({ status: 'ok', database: 'connected' });
});
