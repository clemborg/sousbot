import { createApp } from './app';
import { pool } from './db/client';
import { loadApiEnv } from './config/env';

const app = createApp();

export default app;

if (!process.env.VERCEL) {
  const { port } = loadApiEnv();
  app.listen(port, () => console.log('Sousbot API listening on port ' + port));
  process.on('SIGTERM', async () => {
    await pool.end();
    process.exit(0);
  });
}
