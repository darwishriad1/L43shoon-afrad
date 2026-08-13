import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const SESSION_TTL_SECONDS = 60 * 60 * 8;

function getSessionSecret(): string {
  const secret = process.env.LOCAL_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('LOCAL_SESSION_SECRET must be configured with at least 32 characters');
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

export function createLocalSession(userId: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const nonce = randomBytes(18).toString('base64url');
  const payload = `${userId}.${expiresAt}.${nonce}`;
  return `local_v1.${payload}.${sign(payload)}`;
}

export function verifyLocalSession(token: string): { userId: string; expiresAt: number } | null {
  const parts = token.split('.');
  if (parts.length !== 5 || parts[0] !== 'local_v1') return null;
  const [, userId, expiresAtRaw, nonce, signature] = parts;
  const expiresAt = Number(expiresAtRaw);
  if (!userId || !nonce || !Number.isInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return null;
  const payload = `${userId}.${expiresAt}.${nonce}`;
  const expected = sign(payload);
  const actualBuffer = Buffer.from(signature, 'base64url');
  const expectedBuffer = Buffer.from(expected, 'base64url');
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  return { userId, expiresAt };
}
