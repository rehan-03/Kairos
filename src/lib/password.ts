import crypto from 'node:crypto';

/**
 * Hashes a plain password using Node.js crypto.scryptSync with a random 16-byte salt.
 * Returns the salt and key joined by a colon.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Compares a plain password against a stored hash string (salt:hash).
 */
export function verifyPassword(password: string, combinedHash: string): boolean {
  if (!password || !combinedHash) return false;
  const [salt, key] = combinedHash.split(':');
  if (!salt || !key) return false;
  try {
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}
