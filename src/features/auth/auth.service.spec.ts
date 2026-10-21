import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import type { PrismaService } from '../../database/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { AuthService } from './auth.service.js';
import type { PasswordService } from './password.service.js';
import { hashSessionToken } from './session-token.js';

const user = {
  id: 'user-1',
  email: 'ada@example.com',
  displayName: 'Ada',
  createdAt: new Date('2026-01-01'),
};

describe('AuthService', () => {
  const prisma = {
    user: { create: vi.fn(), findUnique: vi.fn() },
    session: { create: vi.fn(), findUnique: vi.fn(), deleteMany: vi.fn() },
  };
  const passwords = { hash: vi.fn(), verify: vi.fn() };
  const config = { get: vi.fn(() => 30) };
  let service: AuthService;

  beforeEach(() => {
    vi.resetAllMocks();
    config.get.mockReturnValue(30);
    passwords.hash.mockResolvedValue('hashed');
    service = new AuthService(
      prisma as unknown as PrismaService,
      passwords as unknown as PasswordService,
      config as unknown as ConfigService<EnvironmentVariables, true>,
    );
  });

  describe('register', () => {
    it('stores only hashes and returns the raw token once', async () => {
      prisma.user.create.mockResolvedValue(user);

      const result = await service.register({
        email: user.email,
        displayName: 'Ada',
        password: 'secret-password',
      });

      const { data } = prisma.user.create.mock.calls[0][0];
      expect(data.passwordHash).toBe('hashed');
      expect(data).not.toHaveProperty('password');
      expect(data.sessions.create.tokenHash).toBe(
        hashSessionToken(result.token),
      );
      expect(result.user).toBe(user);
      expect(result.expiresAt.getTime()).toBeGreaterThan(
        Date.now() + 29 * 86_400_000,
      );
    });

    it('reports a duplicate email as a conflict', async () => {
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.register({
          email: user.email,
          displayName: 'Ada',
          password: 'x'.repeat(8),
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('still runs a password check for unknown emails', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      passwords.verify.mockResolvedValue(false);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'whatever' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(passwords.verify).toHaveBeenCalledWith('whatever', 'hashed');
    });

    it('rejects a wrong password with the same error', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...user,
        passwordHash: 'stored',
      });
      passwords.verify.mockResolvedValue(false);

      await expect(
        service.login({ email: user.email, password: 'wrong' }),
      ).rejects.toThrow('Incorrect email or password');
      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it('starts a session without exposing the password hash', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...user,
        passwordHash: 'stored',
      });
      passwords.verify.mockResolvedValue(true);

      const result = await service.login({
        email: user.email,
        password: 'right',
      });

      expect(result.user).toEqual(user);
      expect(prisma.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: user.id,
          tokenHash: hashSessionToken(result.token),
        }),
      });
    });
  });

  describe('authenticate', () => {
    it('returns the user for a live session', async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        expiresAt: new Date(Date.now() + 60_000),
        user,
      });

      await expect(service.authenticate('token')).resolves.toEqual({
        user,
        sessionId: 'session-1',
      });
      expect(prisma.session.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tokenHash: hashSessionToken('token') },
        }),
      );
    });

    it('rejects and removes an expired session', async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        expiresAt: new Date(Date.now() - 1),
        user,
      });

      await expect(service.authenticate('token')).resolves.toBeNull();
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      });
    });

    it('rejects an unknown token', async () => {
      prisma.session.findUnique.mockResolvedValue(null);
      await expect(service.authenticate('token')).resolves.toBeNull();
    });
  });
});
