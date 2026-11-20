import { Router } from 'express';
import crypto from 'crypto';
import * as oidc from 'openid-client';
import { getAuthorizationUrl, exchangeCodeForTokens, parseUserFromToken } from '../services/microsoft.js';
import { authConfig, oidcConfig, getOidcServerConfig, resetOidcServerConfig } from '../config/auth.js';
import { findOrCreateUser, syncOidcUser } from '../services/userService.js';
import { mapGroupsToRoleAndTenant } from '../services/oidcService.js';
import { getTenantBySlugOrId } from '../services/tenantService.js';
import { generateToken, revokeToken } from '../services/jwtService.js';
import { requireAuth } from '../middleware/authenticate.js';

const router = Router();

// Store for CSRF states (Microsoft OAuth & OIDC)
const stateStore = new Map();

function cleanOldStates() {
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  for (const [key, value] of stateStore.entries()) {
    if (value.createdAt < tenMinutesAgo) {
      stateStore.delete(key);
    }
  }
}

// GET /api/auth/config - Expose auth providers available to frontend
router.get('/config', (req, res) => {
  res.json({
    oidc: {
      enabled: oidcConfig.enabled,
      buttonLabel: process.env.OIDC_BUTTON_LABEL || 'Kirjaudu Tunnuksella',
    },
    azure: {
      enabled: Boolean(process.env.AZURE_CLIENT_ID),
      buttonLabel: process.env.AZURE_BUTTON_LABEL || 'Kirjaudu Microsoft-tilillä',
    },
  });
});

// GET /api/auth/login - Main login route (defaults to OIDC if configured, else Microsoft)
router.get('/login', async (req, res, next) => {
  const provider = req.query.provider || (oidcConfig.enabled ? 'oidc' : 'azure');
  if (provider === 'oidc' && oidcConfig.enabled) {
    return handleOidcLogin(req, res, next);
  }
  return handleAzureLogin(req, res, next);
});

// GET /api/auth/oidc/login - Explicit OIDC login
router.get('/oidc/login', (req, res, next) => handleOidcLogin(req, res, next));

// GET /api/auth/oidc/callback - Handle OIDC callback
router.get('/oidc/callback', (req, res, next) => handleOidcCallback(req, res, next));

// GET /api/auth/azure/login - Explicit Azure login
router.get('/azure/login', (req, res, next) => handleAzureLogin(req, res, next));

// GET /api/auth/callback - Microsoft OAuth callback (backward compatible)
router.get('/callback', async (req, res, next) => {
  // If state matches OIDC state with pkceVerifier, handle as OIDC
  const state = req.query.state;
  if (state && stateStore.has(state) && stateStore.get(state).codeVerifier) {
    return handleOidcCallback(req, res, next);
  }
  return handleAzureCallback(req, res, next);
});

// ──────────────────────────────────────────────
// OIDC handlers
// ──────────────────────────────────────────────
async function handleOidcLogin(req, res, next) {
  try {
    cleanOldStates();

    const oidcServerConfig = await getOidcServerConfig();
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();

    const returnUrl = req.query.returnUrl || '/';
    stateStore.set(state, {
      createdAt: Date.now(),
      returnUrl,
      codeVerifier,
      nonce,
      type: 'oidc',
    });

    const redirectUri = oidcConfig.redirectUri || `${req.protocol}://${req.get('host')}/api/auth/oidc/callback`;

    const authUrl = oidc.buildAuthorizationUrl(oidcServerConfig, {
      redirect_uri: redirectUri,
      scope: oidcConfig.scopes,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
      nonce,
    });

    res.redirect(authUrl.href);
  } catch (error) {
    resetOidcServerConfig();
    console.error('OIDC login initiation failed:', error);
    next(error);
  }
}

async function handleOidcCallback(req, res, next) {
  const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.error('OIDC callback error:', error, error_description);
      return res.redirect(`${frontendUrl}/#error=${encodeURIComponent(error_description || error)}`);
    }

    if (!state || !stateStore.has(state)) {
      return res.redirect(`${frontendUrl}/#error=invalid_state`);
    }

    const stateData = stateStore.get(state);
    stateStore.delete(state);

    if (Date.now() - stateData.createdAt > 10 * 60 * 1000) {
      return res.redirect(`${frontendUrl}/#error=state_expired`);
    }

    const oidcServerConfig = await getOidcServerConfig();
    const currentUrl = new URL(req.originalUrl, `${req.protocol}://${req.get('host')}`);

    const tokens = await oidc.authorizationCodeGrant(oidcServerConfig, currentUrl, {
      pkceCodeVerifier: stateData.codeVerifier,
      expectedState: state,
      expectedNonce: stateData.nonce,
    });

    const claims = tokens.claims() || {};
    const sub = String(claims.sub || '');
    if (!sub) {
      return res.redirect(`${frontendUrl}/#error=missing_sub`);
    }

    const email = String(claims.email || claims.upn || claims.preferred_username || '');
    const name = String(claims.name || claims.given_name || claims.preferred_username || email || sub);
    const groups = Array.isArray(claims.groups) ? claims.groups.map(String) : [];

    // Map OIDC groups to role and tenant
    const { role, tenantSlug } = mapGroupsToRoleAndTenant(
      groups,
      oidcConfig.groupRoleMap,
      oidcConfig.defaultTenantSlug
    );

    // Resolve tenant ID if tenantSlug is found
    let tenantId = null;
    if (tenantSlug) {
      const tenantRow = await getTenantBySlugOrId(tenantSlug);
      if (tenantRow) {
        tenantId = tenantRow.id;
      }
    }

    // Sync or create user in database
    const user = await syncOidcUser({
      oidcSub: sub,
      email,
      name,
      role,
      tenantId,
    });

    // Generate session JWT
    const jwtToken = generateToken(user);
    const returnUrl = stateData.returnUrl || '/';

    res.redirect(`${frontendUrl}${returnUrl}#token=${jwtToken}`);
  } catch (error) {
    resetOidcServerConfig();
    console.error('OIDC callback processing failed:', error);
    res.redirect(`${frontendUrl}/#error=${encodeURIComponent(error.message || 'authentication_failed')}`);
  }
}

// ──────────────────────────────────────────────
// Microsoft / Azure handlers
// ──────────────────────────────────────────────
async function handleAzureLogin(req, res, next) {
  try {
    cleanOldStates();

    const state = crypto.randomBytes(32).toString('hex');
    stateStore.set(state, {
      createdAt: Date.now(),
      returnUrl: req.query.returnUrl || '/',
      type: 'azure',
    });

    const authUrl = await getAuthorizationUrl(state);
    res.redirect(authUrl);
  } catch (error) {
    console.error('Azure login initiation failed:', error);
    next(error);
  }
}

async function handleAzureCallback(req, res, next) {
  const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.error('Azure OAuth error:', error, error_description);
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error_description || error)}`);
    }

    if (!state || !stateStore.has(state)) {
      return res.redirect(`${frontendUrl}/login?error=invalid_state`);
    }

    const stateData = stateStore.get(state);
    stateStore.delete(state);

    if (Date.now() - stateData.createdAt > 5 * 60 * 1000) {
      return res.redirect(`${frontendUrl}/login?error=state_expired`);
    }

    const tokenResponse = await exchangeCodeForTokens(code);
    const microsoftUser = parseUserFromToken(tokenResponse);

    const user = await findOrCreateUser({
      microsoftOid: microsoftUser.microsoftOid,
      email: microsoftUser.email,
      name: microsoftUser.name,
    });

    const jwtToken = generateToken(user);
    const returnUrl = stateData.returnUrl || '/';

    res.redirect(`${frontendUrl}${returnUrl}#token=${jwtToken}`);
  } catch (error) {
    console.error('Azure callback error:', error);
    next(error);
  }
}

// POST /api/auth/logout - Revoke current token
router.post('/logout', requireAuth, (req, res) => {
  revokeToken(req.token);
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// GET /api/auth/me - Get current user info
router.get('/me', requireAuth, (req, res) => {
  const { id, email, name, role, tenant_id, created_at, last_login } = req.user;

  res.json({
    user: {
      id,
      email,
      name,
      role,
      tenantId: tenant_id,
      createdAt: created_at,
      lastLogin: last_login,
    },
  });
});

export { stateStore };
export default router;
