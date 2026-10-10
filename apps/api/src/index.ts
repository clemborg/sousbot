import { createApp } from './app';
import { agentLog } from './debug-agent-log';

// #region agent log
agentLog('H4', 'src/index.ts:load', 'vercel entry loading', {
  cwd: process.cwd(),
  vercel: Boolean(process.env.VERCEL),
  commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
});
// #endregion

const app = createApp();

// #region agent log
agentLog('H5', 'src/index.ts:load', 'createApp success', {
  stackLength: (app as unknown as { _router?: { stack?: unknown[] } })._router?.stack?.length ?? null,
});
// #endregion

export default app;
