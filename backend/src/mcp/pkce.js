import { createHash, randomBytes } from 'crypto';

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function verifyS256(verifier, challenge) {
  if (!verifier || !challenge) return false;
  return createHash('sha256').update(verifier).digest('base64url') === challenge;
}
