import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/auth.js';

// Store for revoked tokens (in production, use Redis)
const revokedTokens = new Set();

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

  return jwt.verify(token, jwtConfig.secret, {
    algorithms: [jwtConfig.algorithm],
  });
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
