import { Router } from 'express';
import { createHash } from 'crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomToken, verifyS256 } from './pkce.js';
import { fetchCimdMetadata, validateRedirectUri } from './cimd.js';
import { issueAccessToken, verifyAccessToken, issueLoginTicket, verifyLoginTicket } from './jwt.js';
import { contentSecurityPolicy, redirectSource } from './csp.js';
import { saveAuthorizationCode, consumeAuthorizationCode, saveRefreshToken, getRefreshToken } from './store.js';
import { createMcpServer } from './server.js';
import { findUserById, findUserByEmail } from '../services/userService.js';
import { oidcConfig } from '../config/auth.js';

const router = Router();

function deriveBasePath(rawUrl) {
  if (!rawUrl) return '';
  try {
    const url = new URL(rawUrl);
    const pathname = url.pathname.replace(/\/+$/, '');
    return pathname === '/' ? '' : pathname;
  } catch (e) {
    return '';
  }
}

function getPublicUrl(req) {
  if (process.env.MCP_PUBLIC_URL) {
    return process.env.MCP_PUBLIC_URL.replace(/\/+$/, '');
  }
  if (process.env.BASE_URL) {
    return process.env.BASE_URL.replace(/\/+$/, '');
  }
  const basePath = deriveBasePath(process.env.BASE_URL);
  const host = req.get('host') || 'localhost:3000';
  const proto = req.protocol || 'http';
  return `${proto}://${host}${basePath || ''}`.replace(/\/+$/, '');
}

function getResource(publicUrl) {
  return `${publicUrl}/mcp`;
}

function escapeHtml(val) {
  return String(val || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function page(title, body) {
  return `<!doctype html>
<html lang="fi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f0f4f8; margin: 0; padding: 2.5rem 1rem; color: #1e293b; }
    main { max-width: 440px; margin: 0 auto; background: #fff; padding: 2rem; border-radius: 14px; box-shadow: 0 10px 25px rgba(0,0,0,.07); border: 1px solid #e2e8f0; }
    .logo { text-align: center; font-size: 2.5rem; margin-bottom: 0.5rem; }
    h1 { font-size: 1.35rem; margin: 0 0 0.5rem 0; text-align: center; color: #0f172a; font-weight: 700; }
    .subtitle { font-size: 0.85rem; color: #64748b; text-align: center; margin-bottom: 1.5rem; line-height: 1.4; }
    .box-anon { background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 10px; padding: 1rem; margin-bottom: 1.5rem; text-align: center; }
    .box-anon p { font-size: 0.8rem; color: #475569; margin: 0.4rem 0 0.8rem 0; }
    .btn { display: block; width: 100%; box-sizing: border-box; text-align: center; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; text-decoration: none; border: 0; transition: background 0.15s; }
    .btn-anon { background: #1e3a5f; color: #fff; }
    .btn-anon:hover { background: #162c46; }
    .btn-secondary { background: #f1f5f9; color: #334155; margin-top: 0.5rem; }
    .btn-secondary:hover { background: #e2e8f0; }
    .btn-oidc { background: #0284c7; color: #fff; margin-bottom: 0.8rem; }
    .btn-oidc:hover { background: #0369a1; }
    .divider { display: flex; align-items: center; text-align: center; margin: 1.5rem 0; color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid #e2e8f0; }
    .divider:not(:empty)::before { margin-right: .75em; }
    .divider:not(:empty)::after { margin-left: .75em; }
    label { display: block; font-size: 0.8rem; font-weight: 600; margin: 0.8rem 0 0.3rem 0; color: #334155; }
    input[type="text"], input[type="email"], input[type="password"] { display: block; width: 100%; box-sizing: border-box; padding: 0.65rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 7px; font-size: 0.85rem; }
    .error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 0.6rem; border-radius: 7px; font-size: 0.8rem; margin-bottom: 1rem; }
    .badge { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; background: #e0f2fe; color: #0369a1; }
  </style>
</head>
<body>
  <main>
    <div class="logo">⛪</div>
    ${body}
  </main>
</body>
</html>`;
}

function encodeOAuth(query) {
  return Buffer.from(new URLSearchParams(
    Object.entries(query).filter((entry) => typeof entry[1] === 'string')
  ).toString()).toString('base64url');
}

function decodeOAuth(value) {
  return Object.fromEntries(new URLSearchParams(Buffer.from(value, 'base64url').toString('utf8')));
}

const oauthHash = (oauth) => createHash('sha256').update(oauth).digest('base64url');

function sendHtml(res, html, formAction = [], status = 200) {
  res.status(status);
  res.set('Content-Security-Policy', contentSecurityPolicy(formAction));
  res.set('Cache-Control', 'no-store');
  res.type('text/html').send(html);
}

// ─────────────────────────────────────────────────────────────
// 1. OAUTH METADATA (RFC 8414 & RFC 9728)
// ─────────────────────────────────────────────────────────────

function getProtectedResourceMetadata(publicUrl) {
  return {
    resource: getResource(publicUrl),
    authorization_servers: [publicUrl],
    scopes_supported: ['mcp'],
    bearer_methods_supported: ['header']
  };
}

function getAuthorizationServerMetadata(publicUrl) {
  return {
    issuer: publicUrl,
    authorization_endpoint: `${publicUrl}/oauth/authorize`,
    token_endpoint: `${publicUrl}/oauth/token`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: ['mcp'],
    client_id_metadata_document_supported: true,
    authorization_response_iss_parameter_supported: true
  };
}

router.get(['/.well-known/oauth-protected-resource/mcp', '/.well-known/oauth-protected-resource'], (req, res) => {
  const publicUrl = getPublicUrl(req);
  res.json(getProtectedResourceMetadata(publicUrl));
});

router.get(['/.well-known/oauth-authorization-server', '/.well-known/openid-configuration'], (req, res) => {
  const publicUrl = getPublicUrl(req);
  res.json(getAuthorizationServerMetadata(publicUrl));
});

// ─────────────────────────────────────────────────────────────
// 2. OAUTH AUTHORIZATION ENDPOINT (/oauth/authorize)
// ─────────────────────────────────────────────────────────────

router.get('/oauth/authorize', async (req, res) => {
  const q = req.query;
  const publicUrl = getPublicUrl(req);

  try {
    if (q.response_type !== 'code' || !q.client_id || !q.redirect_uri || !q.code_challenge || q.code_challenge_method !== 'S256') {
      return sendHtml(res, page('Virheellinen pyyntö', '<h1>Virheellinen OAuth-pyyntö</h1><p>Tarkista parametrit (code_challenge ja S256 vaaditaan).</p>'), [], 400);
    }

    const metadata = await fetchCimdMetadata(q.client_id);
    if (!validateRedirectUri(metadata, q.redirect_uri)) {
      return sendHtml(res, page('Virheellinen redirect_uri', '<h1>Virheellinen redirect_uri</h1><p>Osoite ei vastaa asiakassovelluksen rekisteröityjä osoitteita.</p>'), [], 400);
    }

    const clientName = metadata.client_name || q.client_id;
    const encoded = encodeOAuth(q);

    const body = `
      <h1>Liitä tekoälyavustaja</h1>
      <p class="subtitle">Sovellus <strong>${escapeHtml(clientName)}</strong> haluaa yhteyden Suomen ev.lut. kirkon rukoussovellukseen (Weekly Prayers).</p>

      <form method="post" action="${publicUrl}/oauth/authorize">
        <input type="hidden" name="oauth" value="${escapeHtml(encoded)}">

        <div class="box-anon">
          <button type="submit" name="action" value="anonymous" class="btn btn-anon">
            🌐 Jatka anonyymisti (Continue anonymously)
          </button>
          <p>Yhdistä anonyyminä seurakuntalaisena: selaa rukousaiheita, lue Päivän sana ja lähetä julkisia rukouspyyntöjä.</p>
        </div>

        <div class="divider">tai kirjaudu työntekijänä</div>

        <label for="email">Sähköposti (seurakunnan tunnus)</label>
        <input id="email" name="email" type="email" placeholder="nimi@seurakunta.fi" autocomplete="username">

        <label for="password">Salasana / PIN</label>
        <input id="password" name="password" type="password" autocomplete="current-password" placeholder="••••••••">

        <button type="submit" name="action" value="login" class="btn btn-secondary">
          Kirjaudu työntekijänä / ylläpitäjänä
        </button>
      </form>
    `;

    return sendHtml(res, page('Rukoussovellus - Liitä avustaja (MCP)', body), [redirectSource(q.redirect_uri)]);
  } catch (err) {
    return sendHtml(res, page('Virhe pyynnössä', `<h1>Virhe pyynnössä</h1><p>${escapeHtml(err.message)}</p>`), [], 400);
  }
});

router.post('/oauth/authorize', async (req, res) => {
  const body = req.body || {};
  const publicUrl = getPublicUrl(req);
  const resource = getResource(publicUrl);
  const ticketAudience = `${publicUrl}/oauth/authorize`;

  if (!body.oauth) {
    return sendHtml(res, page('Virhe', '<h1>Virheellinen pyyntö</h1><p>OAuth-tiedot puuttuvat.</p>'), [], 400);
  }

  let q;
  let metadata;
  try {
    q = decodeOAuth(body.oauth);
    metadata = await fetchCimdMetadata(q.client_id);
    if (!validateRedirectUri(metadata, q.redirect_uri)) {
      throw new Error('Invalid redirect_uri');
    }
  } catch (err) {
    return sendHtml(res, page('Virhe', '<h1>Virheellinen OAuth-pyyntö</h1>'), [], 400);
  }

  // 1. ACTION: Anonymous login ("Continue anonymously")
  if (body.action === 'anonymous') {
    const code = randomToken();
    await saveAuthorizationCode({
      code,
      clientId: q.client_id,
      redirectUri: q.redirect_uri,
      challenge: q.code_challenge,
      subject: 'anonymous',
      scope: q.scope || 'mcp',
      expires: Date.now() + 60_000
    });

    const target = new URL(q.redirect_uri);
    target.searchParams.set('code', code);
    target.searchParams.set('iss', publicUrl);
    if (q.state) target.searchParams.set('state', q.state);
    return res.redirect(target.toString());
  }

  // 2. ACTION: User Login (Staff / Admin)
  if (body.action === 'login') {
    if (!body.email) {
      return sendHtml(res, page('Kirjautuminen', '<h1>Syötä sähköpostiosoite</h1><p><a href="javascript:history.back()">Palaa takaisin</a></p>'), [], 400);
    }

    const email = body.email.trim().toLowerCase();
    const user = await findUserByEmail(email);

    if (!user) {
      return sendHtml(res, page('Kirjautuminen epäonnistui', `<h1>Käyttäjää ei löytynyt</h1><p>Sähköpostilla ${escapeHtml(email)} ei löytynyt rekisteröityä työntekijätiliä.</p><p><a href="javascript:history.back()">Yritä uudelleen</a> tai jatka anonyymisti.</p>`), [], 401);
    }

    // Generate login ticket for consent decision
    const ticket = await issueLoginTicket(publicUrl, ticketAudience, user.id, oauthHash(body.oauth));
    const clientName = metadata.client_name || q.client_id;

    const consentBody = `
      <h1>Vahvista käyttöoikeus</h1>
      <p class="subtitle">Haluatko antaa tekoälyavustajalle <strong>${escapeHtml(clientName)}</strong> pääsyn rukoussovellukseen käyttäjänä <strong>${escapeHtml(user.name)}</strong> (<span class="badge">${escapeHtml(user.role)}</span>)?</p>

      <form method="post" action="${publicUrl}/oauth/authorize">
        <input type="hidden" name="oauth" value="${escapeHtml(body.oauth)}">
        <input type="hidden" name="ticket" value="${escapeHtml(ticket)}">

        <button type="submit" name="action" value="approve" class="btn btn-anon">
          Hyväksy (Approve)
        </button>
        <button type="submit" name="action" value="deny" class="btn btn-secondary">
          Peruuta (Deny)
        </button>
      </form>
    `;

    return sendHtml(res, page('Vahvista oikeudet (Consent)', consentBody), [redirectSource(q.redirect_uri)]);
  }

  // 3. ACTION: Consent decisions (approve or deny)
  if (body.action === 'approve' || body.action === 'deny') {
    if (!body.ticket) {
      return sendHtml(res, page('Istunto vanhentunut', '<h1>Istunto vanhentunut</h1><p>Kirjaudu uudelleen.</p>'), [], 401);
    }

    const userId = await verifyLoginTicket(publicUrl, ticketAudience, body.ticket, oauthHash(body.oauth));
    if (!userId) {
      return sendHtml(res, page('Istunto vanhentunut', '<h1>Istunto tai lippu vanhentunut</h1><p>Yritä uudelleen.</p>'), [], 401);
    }

    if (body.action !== 'approve') {
      const target = new URL(q.redirect_uri);
      target.searchParams.set('error', 'access_denied');
      target.searchParams.set('iss', publicUrl);
      if (q.state) target.searchParams.set('state', q.state);
      return res.redirect(target.toString());
    }

    const code = randomToken();
    await saveAuthorizationCode({
      code,
      clientId: q.client_id,
      redirectUri: q.redirect_uri,
      challenge: q.code_challenge,
      subject: userId,
      scope: q.scope || 'mcp',
      expires: Date.now() + 60_000
    });

    const target = new URL(q.redirect_uri);
    target.searchParams.set('code', code);
    target.searchParams.set('iss', publicUrl);
    if (q.state) target.searchParams.set('state', q.state);
    return res.redirect(target.toString());
  }

  return sendHtml(res, page('Virhe', '<h1>Tuntematon toiminto</h1>'), [], 400);
});

// ─────────────────────────────────────────────────────────────
// 3. OAUTH TOKEN ENDPOINT (/oauth/token)
// ─────────────────────────────────────────────────────────────

router.post('/oauth/token', async (req, res) => {
  const b = req.body || {};
  const publicUrl = getPublicUrl(req);
  const resource = getResource(publicUrl);

  res.set('Cache-Control', 'no-store');

  if (b.grant_type === 'authorization_code') {
    if (!b.code || !b.code_verifier) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'code and code_verifier required' });
    }

    const record = await consumeAuthorizationCode(b.code);
    if (!record || b.client_id !== record.clientId || b.redirect_uri !== record.redirectUri || !verifyS256(b.code_verifier, record.challenge)) {
      return res.status(400).json({ error: 'invalid_grant' });
    }

    const accessToken = await issueAccessToken(publicUrl, resource, record.subject, record.clientId, record.scope);
    const refreshToken = randomToken();
    await saveRefreshToken({
      token: refreshToken,
      clientId: record.clientId,
      subject: record.subject,
      scope: record.scope,
      expires: Date.now() + 30 * 86_400_000
    });

    return res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: refreshToken,
      scope: record.scope
    });
  }

  if (b.grant_type === 'refresh_token') {
    if (!b.refresh_token) {
      return res.status(400).json({ error: 'invalid_request' });
    }

    const record = await getRefreshToken(b.refresh_token);
    if (!record || b.client_id !== record.clientId) {
      return res.status(400).json({ error: 'invalid_grant' });
    }

    if (record.subject !== 'anonymous') {
      const user = await findUserById(record.subject);
      if (!user) return res.status(400).json({ error: 'invalid_grant' });
    }

    const accessToken = await issueAccessToken(publicUrl, resource, record.subject, record.clientId, record.scope);
    return res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: record.scope
    });
  }

  return res.status(400).json({ error: 'unsupported_grant_type' });
});

// ─────────────────────────────────────────────────────────────
// 4. STREAMABLE HTTP MCP ENDPOINT (/mcp)
// ─────────────────────────────────────────────────────────────

router.all('/mcp', async (req, res) => {
  if (req.method === 'HEAD') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed. Use POST.' },
      id: null
    });
  }

  const publicUrl = getPublicUrl(req);
  const resource = getResource(publicUrl);

  const header = req.headers.authorization;
  const challenge = (error) => {
    let wwwAuth = `Bearer resource_metadata="${publicUrl}/.well-known/oauth-protected-resource/mcp", scope="mcp"`;
    if (error) {
      wwwAuth += `, error="${error}", error_description="The access token is missing, expired or invalid."`;
    }
    res.set('WWW-Authenticate', wwwAuth);
    return res.status(401).json({ error: error || 'unauthorized' });
  };

  if (!header || !header.startsWith('Bearer ')) {
    return challenge();
  }

  const token = header.slice('Bearer '.length).trim();
  let payload;
  try {
    const verified = await verifyAccessToken(publicUrl, resource, token);
    payload = verified.payload;
  } catch (err) {
    return challenge('invalid_token');
  }

  // Resolve user identity
  let user;
  if (payload.sub === 'anonymous') {
    user = {
      id: 'anonymous',
      name: 'Anonyymi seurakuntalainen',
      role: 'user',
      isAnonymous: true
    };
  } else {
    user = await findUserById(payload.sub);
    if (!user) {
      return challenge('invalid_token');
    }
  }

  // Instantiate MCP server per request with current user context
  const server = createMcpServer({ publicUrl, user });
  const transport = new StreamableHTTPServerTransport({});

  await server.connect(transport);

  res.on('close', () => {
    transport.close().catch(() => {});
    server.close().catch(() => {});
  });

  await transport.handleRequest(req, res, req.body);
});

export default router;
