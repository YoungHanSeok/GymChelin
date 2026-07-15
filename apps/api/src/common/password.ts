// scrypt 기반 비밀번호 해시와 비교 함수를 제공한다.
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const HASH_BYTES = 64;

export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, HASH_BYTES).toString('hex');

  return `${salt}:${hash}`;
};

export const verifyPassword = (password: string, storedPassword?: string | null) => {
  if (!storedPassword) {
    return false;
  }

  const [salt, storedHash] = storedPassword.split(':');
  if (!salt || !storedHash) {
    return false;
  }

  const passwordHash = scryptSync(password, salt, HASH_BYTES);
  const storedHashBuffer = Buffer.from(storedHash, 'hex');

  if (passwordHash.length !== storedHashBuffer.length) {
    return false;
  }

  return timingSafeEqual(passwordHash, storedHashBuffer);
};
