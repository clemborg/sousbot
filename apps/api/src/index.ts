import express from 'express';

const app = express();

app.get('/api/v1/ping', (_req, res) => {
  res.json({ ok: true, mode: 'vercel-entry' });
});

export default app;
