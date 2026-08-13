import assert from 'node:assert/strict';
import { createLocalSession, verifyLocalSession } from './localSession.ts';
import { hashPassword, verifyPassword, isHashedPassword } from './passwords.ts';

process.env.LOCAL_SESSION_SECRET = 'test-secret-that-is-at-least-32-characters-long';

const session = createLocalSession('user-1');
assert.equal(verifyLocalSession(session)?.userId, 'user-1');
assert.equal(verifyLocalSession(`${session}x`), null);
assert.equal(verifyLocalSession('local_user-1'), null);

const passwordHash = await hashPassword('Correct horse battery staple');
assert.equal(isHashedPassword(passwordHash), true);
assert.equal(await verifyPassword('Correct horse battery staple', passwordHash), true);
assert.equal(await verifyPassword('wrong', passwordHash), false);
assert.equal(await verifyPassword('legacy-pass', 'legacy-pass'), true);

console.log('Security tests passed');
