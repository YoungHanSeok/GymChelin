import { hashPassword, verifyPassword } from './password';

describe('password helpers', () => {
  it('verifies a password against its scrypt hash', () => {
    const hash = hashPassword('correct-password');

    expect(verifyPassword('correct-password', hash)).toBe(true);
    expect(verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('rejects empty or malformed stored hashes', () => {
    expect(verifyPassword('password', null)).toBe(false);
    expect(verifyPassword('password', 'not-a-valid-hash')).toBe(false);
  });
});
