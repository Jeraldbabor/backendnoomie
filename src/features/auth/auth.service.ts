import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../config/env.validation.js';
import { PrismaService } from '../../database/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import {
  AuthContext,
  AuthResult,
  PublicUser,
  publicUserSelect,
} from './auth.types.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { PasswordService } from './password.service.js';
import { generateSessionToken, hashSessionToken } from './session-token.js';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly sessionTtlMs: number;
  /** Compared against when the email is unknown, so login timing doesn't reveal accounts. */
  private dummyHash?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.sessionTtlMs =
      config.get('SESSION_TTL_DAYS', { infer: true }) * DAY_MS;
  }

  async register(dto: RegisterDto): Promise<AuthResult> {
    const passwordHash = await this.passwords.hash(dto.password);
    const session = this.newSession();
    try {
      // User and first session are created in one statement.
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          displayName: dto.displayName,
          passwordHash,
          sessions: { create: session.record },
        },
        select: publicUserSelect,
      });
      return {
        user,
        token: session.token,
        expiresAt: session.record.expiresAt,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { ...publicUserSelect, passwordHash: true },
    });
    const valid = await this.passwords.verify(
      dto.password,
      user?.passwordHash ?? (await this.getDummyHash()),
    );
    if (!user || !valid) {
      throw new UnauthorizedException('Incorrect email or password');
    }

    const { passwordHash: _, ...publicUser } = user;
    await this.prisma.session.deleteMany({
      where: { userId: user.id, expiresAt: { lte: new Date() } },
    });
    return this.startSession(publicUser);
  }

  /** Resolves a bearer token to its user, or null when unknown or expired. */
  async authenticate(token: string): Promise<AuthContext | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      select: { id: true, expiresAt: true, user: { select: publicUserSelect } },
    });
    if (!session) {
      return null;
    }
    if (session.expiresAt <= new Date()) {
      await this.prisma.session.deleteMany({ where: { id: session.id } });
      return null;
    }
    return { user: session.user, sessionId: session.id };
  }

  /** Ends one device's session; other devices stay signed in. */
  async logout(sessionId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { id: sessionId } });
  }

  private async startSession(user: PublicUser): Promise<AuthResult> {
    const session = this.newSession();
    await this.prisma.session.create({
      data: { ...session.record, userId: user.id },
    });
    return { user, token: session.token, expiresAt: session.record.expiresAt };
  }

  private newSession() {
    const token = generateSessionToken();
    return {
      token,
      record: {
        tokenHash: hashSessionToken(token),
        expiresAt: new Date(Date.now() + this.sessionTtlMs),
      },
    };
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.passwords.hash('noomie-dummy-password');
    return this.dummyHash;
  }
}
