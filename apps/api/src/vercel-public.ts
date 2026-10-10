import { existsSync } from 'node:fs';
import { dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Express, NextFunction, Request, Response } from 'express';

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
  if (!publicDir) return;

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api/')) return next();

    const relative = normalize(req.path.replace(/^\//, ''));
    if (relative.includes('..')) return next();

    const filePath = relative ? join(publicDir, relative) : join(publicDir, 'index.html');
    if (existsSync(filePath)) {
      res.sendFile(filePath);
      return;
    }

    res.sendFile(join(publicDir, 'index.html'));
  });
}
