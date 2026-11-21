import { query } from '../db/index.js';

// In-memory fallbacks
const memCodes = new Map();
const memRefresh = new Map();

export async function saveAuthorizationCode({ code, clientId, redirectUri, challenge, subject, scope = 'mcp', expires }) {
  const expiresAt = new Date(expires);
  try {
    await query(
      `INSERT INTO mcp_authorization_codes (code, client_id, redirect_uri, challenge, subject, scope, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [code, clientId, redirectUri, challenge, subject, scope, expiresAt]
    );
  } catch (err) {
    memCodes.set(code, {
      code,
      clientId,
      redirectUri,
      challenge,
      subject,
      scope,
      expires: expiresAt.getTime()
    });
  }
}

export async function peekAuthorizationCode(code) {
  try {
    const res = await query(
      `SELECT code FROM mcp_authorization_codes
       WHERE code = $1 AND expires_at > NOW()`,
      [code]
    );
    if (res.rows.length > 0) {
      return true;
    }
  } catch (err) {
    // Check in-memory
  }

  const record = memCodes.get(code);
  return Boolean(record && record.expires > Date.now());
}

export async function consumeAuthorizationCode(code) {
  try {
    const res = await query(
      `DELETE FROM mcp_authorization_codes
       WHERE code = $1 AND expires_at > NOW()
       RETURNING *`,
      [code]
    );
    if (res.rows.length > 0) {
      const row = res.rows[0];
      return {
        code: row.code,
        clientId: row.client_id,
        redirectUri: row.redirect_uri,
        challenge: row.challenge,
        subject: row.subject,
        scope: row.scope,
        expires: new Date(row.expires_at).getTime()
      };
    }
  } catch (err) {
    // Check in-memory
  }

  const record = memCodes.get(code);
  if (record) {
    memCodes.delete(code);
    if (record.expires > Date.now()) {
      return record;
    }
  }
  return null;
}

export async function saveRefreshToken({ token, clientId, subject, scope = 'mcp', expires }) {
  const expiresAt = new Date(expires);
  try {
    await query(
      `INSERT INTO mcp_refresh_tokens (token, client_id, subject, scope, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [token, clientId, subject, scope, expiresAt]
    );
  } catch (err) {
    memRefresh.set(token, {
      token,
      clientId,
      subject,
      scope,
      expires: expiresAt.getTime()
    });
  }
}

export async function getRefreshToken(token) {
  try {
    const res = await query(
      `SELECT * FROM mcp_refresh_tokens
       WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );
    if (res.rows.length > 0) {
      const row = res.rows[0];
      return {
        token: row.token,
        clientId: row.client_id,
        subject: row.subject,
        scope: row.scope,
        expires: new Date(row.expires_at).getTime()
      };
    }
  } catch (err) {
    // Check in-memory
  }

  const record = memRefresh.get(token);
  if (record && record.expires > Date.now()) {
    return record;
  }
  return null;
}

export async function revokeRefreshTokensBySubject(subject) {
  if (!subject) return;
  try {
    await query(
      `DELETE FROM mcp_refresh_tokens WHERE subject = $1`,
      [subject]
    );
  } catch (err) {
    // Check in-memory
  }

  for (const [key, record] of memRefresh.entries()) {
    if (record.subject === subject) {
      memRefresh.delete(key);
    }
  }
}

export function clearMemoryStores() {
  memCodes.clear();
  memRefresh.clear();
}
