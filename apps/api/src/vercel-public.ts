import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Express, Request, Response } from 'express';

function resolvePublicDir(): string | undefined {
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
  for (const dir of candidates) {
    if (existsSync(join(dir, 'index.html'))) return resolve(dir);
  }
  return undefined;
}

/** Serves synced Vite output when the Express CDN static layer is not attached. */
export function installVercelPublicFallback(app: Express): void {
  const publicDir = resolvePublicDir();
  if (!publicDir) {
    app.get('/', (_req, res) => {
      res.status(503).type('text/plain').send('UI not deployed (missing public/index.html).');
    });
    return;
  }

  const indexHtml = readFileSync(join(publicDir, 'index.html'), 'utf8');

  const sendIndex = (_req: Request, res: Response) => {
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
