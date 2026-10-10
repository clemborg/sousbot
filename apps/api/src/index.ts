import { createRequire } from 'node:module';
import { agentLog } from './debug-agent-log';

const require = createRequire(import.meta.url);

// #region agent log
agentLog('H4', 'src/index.ts:load', 'vercel entry loading (cjs bundle)', {
  cwd: process.cwd(),
  vercel: Boolean(process.env.VERCEL),
  commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
});
// #endregion

const createApp = require('../dist/index.cjs').default as () => import('express').Express;
const app = createApp();

// #region agent log
agentLog('H5', 'src/index.ts:load', 'createApp success (cjs bundle)', {
  stackLength: (app as unknown as { _router?: { stack?: unknown[] } })._router?.stack?.length ?? null,
});
// #endregion

export default app;
