import 'dotenv/config';
import app from './server-app';
import { closePool } from './db/client';
import { getApiEnv } from './config/env';

const { port } = getApiEnv();
app.listen(port, () => console.log('Sousbot API listening on port ' + port));
process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});
