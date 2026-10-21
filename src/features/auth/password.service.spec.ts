import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  const passwords = new PasswordService();

  it('verifies the original password and rejects others', async () => {
    const hash = await passwords.hash('correct horse battery');

    expect(hash).toMatch(/^scrypt\$32768\$8\$3\$/);
    expect(hash).not.toContain('correct horse battery');
    await expect(passwords.verify('correct horse battery', hash)).resolves.toBe(
      true,
    );
    await expect(passwords.verify('Correct horse battery', hash)).resolves.toBe(
      false,
    );
  });

  it('salts every hash', async () => {
    const [a, b] = await Promise.all([
      passwords.hash('same password'),
      passwords.hash('same password'),
    ]);
    expect(a).not.toBe(b);
  });

  it('rejects malformed stored hashes instead of throwing', async () => {
    await expect(passwords.verify('anything', '')).resolves.toBe(false);
    await expect(passwords.verify('anything', 'bcrypt$whatever')).resolves.toBe(
      false,
    );
  });
});
