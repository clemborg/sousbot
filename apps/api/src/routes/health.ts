import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../db/client';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  await db.execute(sql`select 1`);
  res.json({ status: 'ok', database: 'connected' });
});
