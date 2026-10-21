import { createHash, randomBytes } from 'node:crypto';

/** 256 bits of randomness, URL-safe. Given to the client once and never stored. */
export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/** The database keeps only this hash, so a leaked table cannot be replayed as tokens. */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Reads `Authorization: Bearer <token>`; returns null for any other shape. */
export function extractBearerToken(header: string | undefined): string | null {
  const [scheme, token, ...rest] = (header ?? '').trim().split(/\s+/);
  if (scheme?.toLowerCase() !== 'bearer' || !token || rest.length > 0) {
    return null;
  }
  return token;
}
