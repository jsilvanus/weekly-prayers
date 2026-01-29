import { Router } from 'express';
import crypto from 'crypto';
import { getAuthorizationUrl, exchangeCodeForTokens, parseUserFromToken } from '../services/microsoft.js';
import { authConfig } from '../config/auth.js';
import { findOrCreateUser } from '../services/userService.js';
import { generateToken, revokeToken } from '../services/jwtService.js';
import { requireAuth } from '../middleware/authenticate.js';

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

// GET /api/auth/callback - Handle Microsoft OAuth callback
router.get('/callback', async (req, res, next) => {
  try {
    const { code, state, error, error_description } = req.query;

    // Check for OAuth errors
    if (error) {
      console.error('OAuth error:', error, error_description);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error_description || error)}`);
    }

    // Validate state
    if (!state || !stateStore.has(state)) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/login?error=invalid_state`);
    }

    const stateData = stateStore.get(state);
    stateStore.delete(state);

    // Check state expiry (5 minutes)
    if (Date.now() - stateData.createdAt > 5 * 60 * 1000) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/login?error=state_expired`);
    }

    // Exchange code for tokens
    const tokenResponse = await exchangeCodeForTokens(code);

    // Parse user info from token
    const microsoftUser = parseUserFromToken(tokenResponse);

    // Create or update user in database
    const user = await findOrCreateUser({
      microsoftOid: microsoftUser.microsoftOid,
      email: microsoftUser.email,
      name: microsoftUser.name,
    });

    // Generate JWT token
    const jwtToken = generateToken(user);

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const returnUrl = stateData.returnUrl || '/';

    // Send token via URL fragment (hash) for security - not sent to server
    res.redirect(`${frontendUrl}${returnUrl}#token=${jwtToken}`);
  } catch (error) {
    console.error('Callback error:', error);
    next(error);
  }
});

// POST /api/auth/logout - Revoke current token
router.post('/logout', requireAuth, (req, res) => {
  // Revoke the current token
  revokeToken(req.token);

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// GET /api/auth/me - Get current user info
router.get('/me', requireAuth, (req, res) => {
  const { id, email, name, role, created_at, last_login } = req.user;

  res.json({
    user: {
      id,
      email,
      name,
      role,
      createdAt: created_at,
      lastLogin: last_login
    }
  });
});

export { stateStore };
export default router;
