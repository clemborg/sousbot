import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const app = require('./dist/index.cjs') as { default: import('express').Express };

export default app.default ?? app;
