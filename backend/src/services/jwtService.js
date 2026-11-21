import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/auth.js';

// Store for revoked tokens (in production, use Redis)
const revokedTokens = new Set();
// Store for revoked users/subjects (subject -> revoked timestamp)
const revokedUsers = new Map();

export function revokeUser(subject) {
  if (subject) {
    revokedUsers.set(subject, Date.now());
  }
}

export function isUserRevoked(subject, iat) {
  if (!subject) return false;
  const revokedAt = revokedUsers.get(subject);
  if (!revokedAt) return false;
  if (!iat) return true;
  return iat * 1000 <= revokedAt;
}

export function clearRevocations() {
  revokedTokens.clear();
  revokedUsers.clear();
}

export function generateToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
    algorithm: jwtConfig.algorithm,
  });
}

export function verifyToken(token) {
  if (revokedTokens.has(token)) {
    throw new Error('Token has been revoked');
  }

  const decoded = jwt.verify(token, jwtConfig.secret, {
    algorithms: [jwtConfig.algorithm],
  });

  if (decoded.sub && isUserRevoked(decoded.sub, decoded.iat)) {
    throw new Error('Token has been revoked');
  }

  return decoded;
}

export function revokeToken(token) {
  revokedTokens.add(token);

  // Schedule cleanup after token expiry
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      const expiryMs = decoded.exp * 1000 - Date.now();
      if (expiryMs > 0) {
        setTimeout(() => {
          revokedTokens.delete(token);
        }, expiryMs);
      }
    }
  } catch (e) {
    // If decode fails, token will stay in revoked set
  }
}

export function decodeToken(token) {
  return jwt.decode(token);
}
