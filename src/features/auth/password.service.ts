import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

type ScryptParams = { N: number; r: number; p: number };

// OWASP-recommended scrypt cost: N=2^15, r=8, p=3 (about 32 MiB per hash).
// Parameters are stored with each hash, so they can be raised later without
// invalidating existing passwords.
const PARAMS: ScryptParams = { N: 2 ** 15, r: 8, p: 3 };
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
// Node refuses scrypt work needing more than 32 MiB unless maxmem is raised.
const MAX_MEMORY = 64 * 1024 * 1024;

function deriveKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  params: ScryptParams,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      keyLength,
      { ...params, maxmem: MAX_MEMORY },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

@Injectable()
export class PasswordService {
  /** Returns `scrypt$N$r$p$salt$key`, with salt and key base64-encoded. */
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH);
    const key = await deriveKey(password, salt, KEY_LENGTH, PARAMS);
    return [
      'scrypt',
      PARAMS.N,
      PARAMS.r,
      PARAMS.p,
      salt.toString('base64'),
      key.toString('base64'),
    ].join('$');
  }

  async verify(password: string, storedHash: string): Promise<boolean> {
    const [algorithm, N, r, p, salt, key] = storedHash.split('$');
    if (algorithm !== 'scrypt' || !salt || !key) {
      return false;
    }
    const expected = Buffer.from(key, 'base64');
    const actual = await deriveKey(
      password,
      Buffer.from(salt, 'base64'),
      expected.length,
      { N: Number(N), r: Number(r), p: Number(p) },
    );
    return timingSafeEqual(actual, expected);
  }
}
