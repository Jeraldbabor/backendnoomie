import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import type { AuthenticatedRequest } from './auth.types.js';
import { extractBearerToken } from './session-token.js';

/** Resolves the bearer token to a session and attaches it, or answers 401. */
async function attachSession(
  auth: AuthService,
  request: AuthenticatedRequest,
): Promise<true> {
  const token = extractBearerToken(request.headers.authorization);
  const session = token ? await auth.authenticate(token) : null;
  if (!session) {
    throw new UnauthorizedException('Sign in to continue');
  }
  request.auth = session;
  return true;
}

/** Requires a valid session token and exposes it to handlers via `@CurrentAuth()`. */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate(context: ExecutionContext): Promise<boolean> {
    return attachSession(
      this.auth,
      context.switchToHttp().getRequest<AuthenticatedRequest>(),
    );
  }
}

/**
 * For public routes that personalize their response when the caller is signed in.
 * Without an Authorization header the request continues anonymously and `@CurrentAuth()`
 * is undefined. A header that is present but invalid or expired still answers 401, so the
 * app learns its session is over instead of silently getting anonymous results.
 */
@Injectable()
export class OptionalSessionAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.headers.authorization === undefined) {
      return true;
    }
    return attachSession(this.auth, request);
  }
}
