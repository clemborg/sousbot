import { createRequire } from 'node:module';
import { agentLog } from './src/debug-agent-log';

const require = createRequire(import.meta.url);

// #region agent log
agentLog('H4', 'index.ts:load', 'vercel entry loading', {
  cwd: process.cwd(),
  vercel: Boolean(process.env.VERCEL),
});
// #endregion

let app: import('express').Express;
try {
  const createApp = require('./dist/index.cjs').default as () => import('express').Express;
  app = createApp();
  // #region agent log
  agentLog('H5', 'index.ts:load', 'createApp success', {
    stackLength: (app as unknown as { _router?: { stack?: unknown[] } })._router?.stack?.length ?? null,
  });
  // #endregion
} catch (err) {
  // #region agent log
  agentLog('H5', 'index.ts:load', 'createApp failed', {
    error: err instanceof Error ? err.message : String(err),
  });
  // #endregion
  throw err;
}

export default app;
