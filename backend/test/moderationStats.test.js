import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import moderationStatsRouter from '../src/routes/moderationStats.js';

// Route-level checks that need no database: authentication is required before anything else.

let server;
let base;

before(async () => {
  const app = express();
  app.use('/api/moderation/stats', moderationStatsRouter);
  app.use((err, req, res, _next) => res.status(500).json({ error: { message: 'internal' } }));
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}/api/moderation/stats`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('GET /api/moderation/stats', () => {
  test('requires authentication', async () => {
    const res = await fetch(`${base}?days=7`);
    assert.equal(res.status, 401);
  });
});
