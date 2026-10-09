import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const h = req.header('authorization');
  if (!h) return next();
  if (!h.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Invalid authorization header' });
    return;
  }
  try {
    const { data, error } = await supabase.auth.getUser(h.slice(7));
    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }
    req.userId = data.user.id;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.userId) {
    res.status(401).json({ error: 'Sign in to save your cooking history' });
    return;
  }
  next();
}

export const authRequired = [optionalAuth, requireAuth];
