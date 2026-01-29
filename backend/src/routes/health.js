import { Router } from 'express';
import { checkConnection } from '../db/index.js';

const router = Router();

router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      api: 'ok',
      database: 'unknown'
    }
  };

  try {
    const dbCheck = await checkConnection();
    health.services.database = dbCheck.connected ? 'ok' : 'error';
    health.database = {
      connected: dbCheck.connected,
      timestamp: dbCheck.timestamp
    };
  } catch (error) {
    health.status = 'degraded';
    health.services.database = 'error';
    health.database = {
      connected: false,
      error: error.message
    };
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;
