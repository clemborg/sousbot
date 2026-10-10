import { existsSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Express, NextFunction, Request, Response } from 'express';

function resolvePublicDir(): string {
  const here =
    typeof __dirname !== 'undefined'
      ? __dirname
      : dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(process.cwd(), 'public'),
    join(here, 'public'),
    join(here, '..', 'public'),
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, 'index.html'))) return dir;
  }
  return candidates[0]!;
}

/** Serves synced Vite output when CDN static layer is unavailable (monorepo Express). */
export function installVercelPublicFallback(app: Express): void {
  if (!process.env.VERCEL) return;

  const publicDir = resolvePublicDir();

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

    const indexPath = join(publicDir, 'index.html');
    if (existsSync(indexPath)) {
      res.sendFile(indexPath);
      return;
    }

    next();
  });
}
