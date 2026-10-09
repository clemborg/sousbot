import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { loadApiEnv } from './config/env';
import { errorHandler } from './middleware/error';
import { healthRouter } from './routes/health';
import { recipesRouter } from './routes/recipes';
import { booksRouter } from './routes/books';

const env = loadApiEnv();

export function createApp() {
  const app = express();
  app.use(cors({ origin: env.webOrigin }));
  app.use(express.json({ limit: '32kb' }));
  app.use('/api/v1', healthRouter);
  app.use('/api/v1', recipesRouter);
  app.use('/api/v1', booksRouter);
  app.use(errorHandler);
  return app;
}
