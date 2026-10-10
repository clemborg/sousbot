import { existsSync } from 'node:fs';
import { join, normalize } from 'node:path';
import type { Express, NextFunction, Request, Response } from 'express';

/** Serves synced Vite output when CDN static layer is unavailable (monorepo Express). */
export function installVercelPublicFallback(app: Express): void {
  if (!process.env.VERCEL) return;

  const publicDir = join(process.cwd(), 'public');

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
