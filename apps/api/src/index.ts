import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const createApp = require('../dist/index.cjs').default as () => import('express').Express;

export default createApp();
