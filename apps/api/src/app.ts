import express from 'express';
import cors from 'cors';
import type { Request, Response, NextFunction } from 'express';
import { getApiEnv } from './config/env';
import { errorHandler } from './middleware/error';
import { healthRouter } from './routes/health';
import { recipesRouter } from './routes/recipes';
import { booksRouter } from './routes/books';

function apiGateway(req: Request, res: Response, next: NextFunction): void {
  let env;
  try {
    env = getApiEnv();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Missing server configuration';
    res.status(503).json({ error: 'Server not configured', message });
    return;
  }
  cors({ origin: env.webOrigin })(req, res, next);
}

export function createApp() {
  const app = express();
  app.get('/api/v1/ping', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/api/v1', apiGateway);
  app.use(express.json({ limit: '32kb' }));
  app.use('/api/v1', healthRouter);
  app.use('/api/v1', recipesRouter);
  app.use('/api/v1', booksRouter);
  app.use(errorHandler);
  return app;
}
