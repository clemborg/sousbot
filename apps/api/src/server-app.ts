import type { Express } from 'express';
import { createApp } from './app';

let app: Express | undefined;

function getApp(): Express {
  if (!app) app = createApp();
  return app;
}

/** Defer createApp until first request so Vite assets exist after the build step. */
const handler = new Proxy(function () {} as Express, {
  apply(_target, _thisArg, args: unknown[]) {
    return (getApp() as unknown as (...a: unknown[]) => unknown)(...args);
  },
  get(_target, prop) {
    const value = (getApp() as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(getApp()) : value;
  },
});

export default handler;
