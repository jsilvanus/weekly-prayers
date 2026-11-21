import { test, describe, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import express from 'express';
import { SignJWT, importJWK, createLocalJWKSet } from 'jose';
import router, {
  getOidcIssuer,
  getProtectedResourceMetadata,
  setRemoteJWKS,
  setTokenRelayFetch,
  handleBackchannelLogout
} from '../src/mcp/routes.js';
import { clearMemoryStores, getRefreshToken, saveRefreshToken } from '../src/mcp/store.js';
import { issueAccessToken } from '../src/mcp/jwt.js';
import { generateToken, verifyToken, clearRevocations } from '../src/services/jwtService.js';
import { createHash } from 'node:crypto';

describe('MCP OAuth & Relay Architecture', () => {
  const ISSUER = 'https://id.riihimaenseurakunta.fi/tunnus';
  const PUBLIC_URL = 'http://localhost:3000';
  const RESOURCE = `${PUBLIC_URL}/mcp`;

  let rsaPrivateKey;
  let rsaPrivateKeyJwk;
  let rsaPublicKeyJwk;
  let localJWKS;
  let app;
  let server;
  let serverUrl;

  before(async () => {
    // Generate RSA 2048 keypair for RS256 signing
    const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    rsaPrivateKey = privateKey;
    rsaPrivateKeyJwk = privateKey.export({ format: 'jwk' });
    const pubJwk = publicKey.export({ format: 'jwk' });
    rsaPublicKeyJwk = {
      ...pubJwk,
      kid: 'tunnus-test-key-1',
      alg: 'RS256',
      use: 'sig'
    };
    rsaPrivateKeyJwk.kid = 'tunnus-test-key-1';
    rsaPrivateKeyJwk.alg = 'RS256';
    localJWKS = createLocalJWKSet({ keys: [rsaPublicKeyJwk] });

    // Mount express app for testing HTTP routes
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(router);

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        serverUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    clearMemoryStores();
    clearRevocations();
    setRemoteJWKS(localJWKS, ISSUER);
    setTokenRelayFetch(globalThis.fetch);
    process.env.MCP_PUBLIC_URL = serverUrl;
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Protected Resource Metadata (RFC 9728)
  // ─────────────────────────────────────────────────────────────
  test('returns RFC 9728 metadata with central authorization server and resource', async () => {
    const meta = getProtectedResourceMetadata(serverUrl);
    assert.equal(meta.resource, `${serverUrl}/mcp`);
    assert.deepEqual(meta.authorization_servers, [ISSUER]);
    assert.deepEqual(meta.scopes_supported, ['mcp']);

    const res = await fetch(`${serverUrl}/.well-known/oauth-protected-resource/mcp`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.resource, `${serverUrl}/mcp`);
    assert.deepEqual(body.authorization_servers, [ISSUER]);
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Hybrid Authorize: Anonymous vs Tunnus OIDC
  // ─────────────────────────────────────────────────────────────
  test('GET /oauth/authorize renders anonymous option and Tunnus OIDC button', async () => {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: 'test-client',
      redirect_uri: 'http://localhost:8080/callback',
      code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
      code_challenge_method: 'S256',
      state: 'state-123'
    });

    const res = await fetch(`${serverUrl}/oauth/authorize?${params.toString()}`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Jatka anonyymisti (Continue anonymously)'));
    assert.ok(html.includes('Kirjaudu työntekijänä (Tunnus OIDC)'));
  });

  test('GET /oauth/authorize with provider=oidc redirects to Tunnus /auth', async () => {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: 'test-client',
      redirect_uri: 'http://localhost:8080/callback',
      code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
      code_challenge_method: 'S256',
      state: 'state-123',
      provider: 'oidc'
    });

    const res = await fetch(`${serverUrl}/oauth/authorize?${params.toString()}`, {
      redirect: 'manual'
    });
    assert.equal(res.status, 302);
    const location = res.headers.get('location');
    assert.ok(location.startsWith(`${ISSUER}/auth`));

    const locUrl = new URL(location);
    assert.equal(locUrl.searchParams.get('client_id'), 'test-client');
    assert.equal(locUrl.searchParams.get('redirect_uri'), 'http://localhost:8080/callback');
    assert.equal(locUrl.searchParams.get('response_type'), 'code');
    assert.equal(locUrl.searchParams.get('code_challenge'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
    assert.equal(locUrl.searchParams.get('resource'), `${serverUrl}/mcp`);
  });

  test('POST /oauth/authorize with action=oidc redirects to Tunnus /auth', async () => {
    const q = {
      response_type: 'code',
      client_id: 'test-client',
      redirect_uri: 'http://localhost:8080/callback',
      code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
      code_challenge_method: 'S256',
      state: 'state-456'
    };
    const encoded = Buffer.from(new URLSearchParams(q).toString()).toString('base64url');

    const res = await fetch(`${serverUrl}/oauth/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ oauth: encoded, action: 'oidc' }).toString(),
      redirect: 'manual'
    });

    assert.equal(res.status, 302);
    const location = res.headers.get('location');
    assert.ok(location.startsWith(`${ISSUER}/auth`));
    const locUrl = new URL(location);
    assert.equal(locUrl.searchParams.get('client_id'), 'test-client');
    assert.equal(locUrl.searchParams.get('code_challenge'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
    assert.equal(locUrl.searchParams.get('resource'), `${serverUrl}/mcp`);
  });

  test('POST /oauth/authorize with action=anonymous creates local code and exchanges locally', async () => {
    // PKCE verifier and challenge
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const challenge = createHash('sha256').update(verifier).digest('base64url');

    const q = {
      response_type: 'code',
      client_id: 'test-client',
      redirect_uri: 'http://localhost:8080/callback',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state: 'anon-state'
    };
    const encoded = Buffer.from(new URLSearchParams(q).toString()).toString('base64url');

    const authRes = await fetch(`${serverUrl}/oauth/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ oauth: encoded, action: 'anonymous' }).toString(),
      redirect: 'manual'
    });

    assert.equal(authRes.status, 302);
    const loc = new URL(authRes.headers.get('location'));
    const code = loc.searchParams.get('code');
    assert.ok(code);
    assert.equal(loc.searchParams.get('state'), 'anon-state');

    // Exchange token at /oauth/token
    const tokenRes = await fetch(`${serverUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        code_verifier: verifier,
        client_id: 'test-client',
        redirect_uri: 'http://localhost:8080/callback'
      }).toString()
    });

    assert.equal(tokenRes.status, 200);
    const tokenData = await tokenRes.json();
    assert.ok(tokenData.access_token);
    assert.ok(tokenData.refresh_token);
    assert.equal(tokenData.token_type, 'Bearer');

    // Refresh token exchange
    const refreshRes = await fetch(`${serverUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenData.refresh_token,
        client_id: 'test-client'
      }).toString()
    });

    assert.equal(refreshRes.status, 200);
    const refreshData = await refreshRes.json();
    assert.ok(refreshData.access_token);
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Central Relay on /oauth/token
  // ─────────────────────────────────────────────────────────────
  test('POST /oauth/token relays non-local code to central Tunnus token endpoint', async () => {
    let relayedBody = null;
    let relayedUrl = null;

    setTokenRelayFetch(async (url, init) => {
      relayedUrl = url;
      relayedBody = init.body;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'central-tunnus-access-token-xyz',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'central-tunnus-refresh-token-xyz',
          scope: 'mcp'
        })
      };
    });

    const res = await fetch(`${serverUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'tunnus-central-code-12345',
        code_verifier: 'verifier-12345',
        client_id: 'test-client',
        redirect_uri: 'http://localhost:8080/callback'
      }).toString()
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.access_token, 'central-tunnus-access-token-xyz');
    assert.equal(relayedUrl, `${ISSUER}/token`);
    assert.ok(relayedBody.includes('code=tunnus-central-code-12345'));
  });

  test('POST /oauth/token relays non-local refresh_token to central Tunnus token endpoint', async () => {
    setTokenRelayFetch(async (url, init) => ({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'new-central-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'mcp'
      })
    }));

    const res = await fetch(`${serverUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: 'central-refresh-token-abc',
        client_id: 'test-client'
      }).toString()
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.access_token, 'new-central-access-token');
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Dual-Layer Token Verification on POST /mcp
  // ─────────────────────────────────────────────────────────────
  test('POST /mcp accepts valid RS256 token issued by Tunnus', async () => {
    // Mint RS256 token signed with Tunnus key
    const privateKeyObj = await importJWK(rsaPrivateKeyJwk, 'RS256');

    const rs256Token = await new SignJWT({
      email: 'pappi@riihimaki.fi',
      name: 'Pappi Maija',
      role: 'worker',
      scope: 'mcp'
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'tunnus-test-key-1' })
      .setSubject('tunnus-user-uuid-123')
      .setIssuer(ISSUER)
      .setAudience([`${serverUrl}/mcp`, serverUrl])
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKeyObj);

    // Call MCP endpoint with tools/list JSON-RPC
    const mcpRes = await fetch(`${serverUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${rs256Token}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 1
      })
    });

    assert.equal(mcpRes.status, 200);
    const text = await mcpRes.text();
    assert.ok(text.includes('get_current_prayers'));
    assert.ok(text.includes('get_daily_word'));
  });

  test('POST /mcp accepts local HS256 anonymous token', async () => {
    const localToken = await issueAccessToken(serverUrl, `${serverUrl}/mcp`, 'anonymous', 'test-client', 'mcp');

    const mcpRes = await fetch(`${serverUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${localToken}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 2
      })
    });

    assert.equal(mcpRes.status, 200);
    const text = await mcpRes.text();
    // Anonymous public tools
    assert.ok(text.includes('get_current_prayers'));
    assert.ok(text.includes('get_daily_word'));
  });

  test('POST /mcp rejects missing or invalid token with 401 challenge', async () => {
    const noAuth = await fetch(`${serverUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 3 })
    });
    assert.equal(noAuth.status, 401);
    assert.ok(noAuth.headers.get('www-authenticate').includes('resource_metadata='));

    const badAuth = await fetch(`${serverUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer bad.token.here'
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 4 })
    });
    assert.equal(badAuth.status, 401);
    assert.ok(badAuth.headers.get('www-authenticate').includes('error="invalid_token"'));
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Back-Channel Logout & Revocation
  // ─────────────────────────────────────────────────────────────
  test('Back-channel logout revokes refresh tokens and active user sessions', async () => {
    const targetSub = 'tunnus-user-logout-test';

    // 1. Setup a local refresh token for targetSub
    await saveRefreshToken({
      token: 'refresh-token-for-user',
      clientId: 'test-client',
      subject: targetSub,
      scope: 'mcp',
      expires: Date.now() + 86400000
    });
    const saved = await getRefreshToken('refresh-token-for-user');
    assert.ok(saved);

    // 2. Setup an active session token for targetSub in jwtService
    const sessionToken = generateToken({
      id: targetSub,
      email: 'test@seurakunta.fi',
      name: 'Test Staff',
      role: 'worker'
    });
    const verifiedBefore = verifyToken(sessionToken);
    assert.equal(verifiedBefore.sub, targetSub);

    // 3. Mint valid RS256 logout_token signed by Tunnus key
    const privateKeyObj = await importJWK(rsaPrivateKeyJwk, 'RS256');

    const logoutToken = await new SignJWT({
      events: {
        'http://schemas.openid.net/event/backchannel-logout': {}
      }
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'tunnus-test-key-1' })
      .setSubject(targetSub)
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime('2m')
      .sign(privateKeyObj);

    // 4. Send Back-Channel Logout request
    const logoutRes = await fetch(`${serverUrl}/api/auth/backchannel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ logout_token: logoutToken }).toString()
    });

    assert.equal(logoutRes.status, 200);
    const logoutBody = await logoutRes.json();
    assert.deepEqual(logoutBody, { ok: true });

    // 5. Verify refresh token was revoked
    const afterLogout = await getRefreshToken('refresh-token-for-user');
    assert.equal(afterLogout, null);

    // 6. Verify session token was revoked
    assert.throws(() => verifyToken(sessionToken), /Token has been revoked/);
  });

  test('Back-channel logout rejects invalid logout_token', async () => {
    const res = await fetch(`${serverUrl}/api/auth/backchannel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ logout_token: 'invalid.token' }).toString()
    });
    assert.equal(res.status, 400);
  });
});
