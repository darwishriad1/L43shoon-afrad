import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(nodeScrypt);
const PREFIX = 'scrypt$';

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `${PREFIX}${salt}$${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  if (!stored.startsWith(PREFIX)) {
    // Legacy plaintext values are accepted only for one migration login, then should be replaced.
    return stored === password;
  }
  const [, salt, hash] = stored.split('$');
  if (!salt || !hash) return false;
  const derived = await scrypt(password, salt, 64) as Buffer;
  const expected = Buffer.from(hash, 'hex');
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export function isHashedPassword(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith(PREFIX));
}

export function generateTemporaryPassword(): string {
  return randomBytes(12).toString('base64url');
}
