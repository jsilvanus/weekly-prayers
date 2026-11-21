import { SignJWT, jwtVerify } from 'jose';
import { jwtConfig } from '../config/auth.js';

function getSecretBytes() {
  const secret = jwtConfig.secret || 'weekly_prayers_jwt_secret_dev_key';
  return new TextEncoder().encode(secret);
}

/**
 * Issue an access token for MCP client bound to issuer and audience (RFC 9728)
 */
export async function issueAccessToken(issuer, resource, subject, clientId, scope = 'mcp') {
  const secretBytes = getSecretBytes();
  return new SignJWT({ client_id: clientId, scope })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(subject)
    .setIssuer(issuer)
    .setAudience(resource)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secretBytes);
}

/**
 * Verify an access token's signature, issuer and resource audience
 */
export async function verifyAccessToken(issuer, resource, token) {
  const secretBytes = getSecretBytes();
  return jwtVerify(token, secretBytes, {
    algorithms: ['HS256'],
    issuer,
    audience: resource
  });
}

/**
 * Issue short-lived login ticket between login and consent steps
 */
export async function issueLoginTicket(issuer, audience, subject, oauthHash) {
  const secretBytes = getSecretBytes();
  return new SignJWT({ typ: 'login', oauth: oauthHash })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(subject)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(secretBytes);
}

/**
 * Verify a login ticket
 */
export async function verifyLoginTicket(issuer, audience, ticket, oauthHash) {
  try {
    const secretBytes = getSecretBytes();
    const { payload } = await jwtVerify(ticket, secretBytes, {
      algorithms: ['HS256'],
      issuer,
      audience
    });
    if (payload.typ !== 'login' || payload.oauth !== oauthHash || typeof payload.sub !== 'string') {
      return null;
    }
    return payload.sub;
  } catch {
    return null;
  }
}
