import express from 'express';
import type { Express } from 'express';

let app: Express;

if (process.env.VERCEL) {
  app = express();
  app.get('/api/v1/ping', (_req, res) => {
    res.json({ ok: true, mode: 'vercel-minimal' });
  });
} else {
  const { createApp } = await import('./app.js');
  const { closePool } = await import('./db/client.js');
  const { getApiEnv } = await import('./config/env.js');
  app = createApp();
  const { port } = getApiEnv();
  app.listen(port, () => console.log('Sousbot API listening on port ' + port));
  process.on('SIGTERM', async () => {
    await closePool();
    process.exit(0);
  });
}

export default app;
