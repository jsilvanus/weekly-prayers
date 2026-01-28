import { Router } from 'express';
import crypto from 'crypto';
import { getAuthorizationUrl } from '../services/microsoft.js';

const router = Router();

// Store for CSRF states (in production, use Redis or similar)
const stateStore = new Map();

// GET /api/auth/login - Initiate Microsoft login
router.get('/login', async (req, res, next) => {
  try {
    // Generate CSRF state token
    const state = crypto.randomBytes(32).toString('hex');

    // Store state with expiry (5 minutes)
    stateStore.set(state, {
      createdAt: Date.now(),
      returnUrl: req.query.returnUrl || '/',
    });

    // Clean up old states (older than 10 minutes)
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    for (const [key, value] of stateStore.entries()) {
      if (value.createdAt < tenMinutesAgo) {
        stateStore.delete(key);
      }
    }

    const authUrl = await getAuthorizationUrl(state);
    res.redirect(authUrl);
  } catch (error) {
    next(error);
  }
});

export { stateStore };
export default router;
