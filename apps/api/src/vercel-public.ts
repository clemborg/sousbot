import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Express, Request, Response } from 'express';
import { agentLog } from './debug-agent-log';

export function getPublicDirDiagnostics(): {
  cwd: string;
  here: string;
  vercel: boolean;
  candidates: { path: string; indexHtml: boolean }[];
  resolved: string | null;
} {
  const here =
    typeof __dirname !== 'undefined'
      ? __dirname
      : dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, 'public'),
    join(here, '..', 'public'),
    join(process.cwd(), 'dist', 'public'),
    join(process.cwd(), 'public'),
  ];
  const checked = candidates.map((path) => ({
    path,
    indexHtml: existsSync(join(path, 'index.html')),
  }));
  let resolved: string | null = null;
  for (const dir of candidates) {
    if (existsSync(join(dir, 'index.html'))) {
      resolved = resolve(dir);
      break;
    }
  }
  return {
    cwd: process.cwd(),
    here,
    vercel: Boolean(process.env.VERCEL),
    candidates: checked,
    resolved,
  };
}

function resolvePublicDir(): string | undefined {
  const diag = getPublicDirDiagnostics();
  // #region agent log
  agentLog('H1', 'vercel-public.ts:resolvePublicDir', 'public dir probe', diag);
  // #endregion
  return diag.resolved ?? undefined;
}

/** Serves synced Vite output when the Express CDN static layer is not attached. */
export function installVercelPublicFallback(app: Express): void {
  const publicDir = resolvePublicDir();
  // #region agent log
  agentLog('H2', 'vercel-public.ts:install', 'install fallback', {
    publicDir: publicDir ?? null,
    hasRootRoute: Boolean(publicDir),
  });
  // #endregion
  if (!publicDir) {
    app.get('/', (_req, res) => {
      // #region agent log
      agentLog('H1', 'vercel-public.ts:GET/', '503 missing public', { path: '/' });
      // #endregion
      res.status(503).type('text/plain').send('UI not deployed (missing public/index.html).');
    });
    return;
  }

  const indexHtml = readFileSync(join(publicDir, 'index.html'), 'utf8');

  const sendIndex = (_req: Request, res: Response) => {
    // #region agent log
    agentLog('H2', 'vercel-public.ts:sendIndex', 'serving index.html', {
      publicDir,
      bytes: indexHtml.length,
    });
    // #endregion
    res.setHeader('X-Sousbot-Ui', '1');
    res.type('html').send(indexHtml);
  };

  app.get('/', sendIndex);

  app.get(/^\/(assets|illustrations)\/.+/, (req, res) => {
    const relative = normalize(req.path.replace(/^\//, ''));
    if (relative.includes('..')) {
      res.status(400).end();
      return;
    }
    const filePath = join(publicDir, relative);
    if (!existsSync(filePath)) {
      res.status(404).end();
      return;
    }
    res.sendFile(filePath);
  });

  app.get(/^(?!\/api\/).+/, (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    sendIndex(req, res);
  });
}
