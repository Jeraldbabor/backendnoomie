import type { Request } from 'express';
import type { Prisma } from '../../generated/prisma/client.js';

/** The only user fields the API ever returns. Never includes the password hash. */
export const publicUserSelect = {
  id: true,
  email: true,
  displayName: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{
  select: typeof publicUserSelect;
}>;

export interface AuthResult {
  user: PublicUser;
  /** Send as `Authorization: Bearer <token>`. Returned only once, at sign-in. */
  token: string;
  expiresAt: Date;
}

export interface AuthContext {
  user: PublicUser;
  sessionId: string;
}

export type AuthenticatedRequest = Request & { auth: AuthContext };
