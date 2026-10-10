import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { getDb } from '../db/client';
import { asyncHandler } from '../middleware/async';

export const healthRouter = Router();

healthRouter.get(
  '/health',
  asyncHandler(async (_req, res) => {
    await getDb().execute(sql`select 1`);
    res.json({ status: 'ok', database: 'connected' });
  }),
);
