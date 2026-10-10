import express from 'express';
import cors from 'cors';
import type { Request, Response, NextFunction } from 'express';
import { getApiEnv } from './config/env';
import { errorHandler } from './middleware/error';
import { healthRouter } from './routes/health';
import { recipesRouter } from './routes/recipes';
import { booksRouter } from './routes/books';
import { installVercelPublicFallback, getPublicDirDiagnostics } from './vercel-public';
import { agentLog } from './debug-agent-log';

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
  // #region agent log
  agentLog('H5', 'app.ts:createApp', 'createApp start', {
    vercel: Boolean(process.env.VERCEL),
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
  });
  // #endregion
  const app = express();
  installVercelPublicFallback(app);
  app.get('/api/v1/debug-static', (_req, res) => {
    res.json({
      build: 'debug-static-v1',
      ...getPublicDirDiagnostics(),
    });
  });
  app.get('/api/v1/ping', (_req, res) => {
    res.json({ ok: true, build: 'debug-static-v1' });
  });
  app.use('/api/v1', apiGateway);
  app.use(express.json({ limit: '32kb' }));
  app.use('/api/v1', healthRouter);
  app.use('/api/v1', recipesRouter);
  app.use('/api/v1', booksRouter);
  app.use(errorHandler);
  return app;
}
