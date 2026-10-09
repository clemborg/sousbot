import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  console.error('Unhandled API error', err instanceof Error ? err.message : 'Unknown error');
  res.status(500).json({ error: 'Internal server error' });
}
