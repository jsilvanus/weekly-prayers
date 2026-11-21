import { lookup } from 'dns/promises';

const MAX_BYTES = 64 * 1024;

export function isCimdClientId(clientId) {
  try {
    const u = new URL(clientId);
    return u.protocol === 'https:' && u.pathname !== '/' &&
      !u.username && !u.password && !u.search && !u.hash &&
      !u.pathname.split('/').includes('..');
  } catch {
    return false;
  }
}

async function assertPublicHost(hostname) {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return;
  try {
    const addresses = await lookup(hostname, { all: true });
    for (const { address } of addresses) {
      if (address.startsWith('10.') || address.startsWith('192.168.') || address.startsWith('127.')) {
        throw new Error('Non-public CIMD host not allowed');
      }
    }
  } catch (err) {
    // If DNS check fails, allow fetch to handle connectivity
  }
}

export async function fetchCimdMetadata(clientId) {
  // If it's a standard/local client ID (e.g. desktop clients)
  if (!isCimdClientId(clientId)) {
    return {
      client_id: clientId,
      client_name: clientId,
      redirect_uris: []
    };
  }

  let current = new URL(clientId);
  for (let i = 0; i <= 3; i++) {
    await assertPublicHost(current.hostname);
    const response = await fetch(current, {
      headers: { accept: 'application/json' },
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location || i === 3) throw new Error('Invalid CIMD redirect');
      current = new URL(location, current);
      if (!isCimdClientId(current.toString())) throw new Error('Invalid CIMD redirect');
      continue;
    }

    if (!response.ok) throw new Error(`Unable to fetch CIMD document: status ${response.status}`);
    const length = response.headers.get('content-length');
    if (length && Number(length) > MAX_BYTES) throw new Error('CIMD document is too large');

    const text = await response.text();
    let value;
    try {
      value = JSON.parse(text);
    } catch {
      throw new Error('Invalid JSON in CIMD document');
    }

    if (!value || typeof value !== 'object') throw new Error('Invalid CIMD document');
    if (value.client_id !== clientId || typeof value.client_name !== 'string' || !Array.isArray(value.redirect_uris)) {
      throw new Error('Invalid CIMD document structure');
    }

    return {
      client_id: value.client_id,
      client_name: value.client_name,
      redirect_uris: value.redirect_uris
    };
  }

  throw new Error('Too many CIMD redirects');
}

/**
 * Validate redirect_uri against client metadata or allowed local patterns
 */
export function validateRedirectUri(metadata, redirectUri) {
  if (metadata.redirect_uris && metadata.redirect_uris.includes(redirectUri)) {
    return true;
  }
  // Allow local desktop clients or custom schemes (Cursor, Claude, VSCode, localhost)
  if (redirectUri.startsWith('http://localhost:') ||
      redirectUri.startsWith('http://127.0.0.1:') ||
      redirectUri.startsWith('cursor://') ||
      redirectUri.startsWith('vscode://')) {
    return true;
  }
  return false;
}
