import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import type { AuthenticatedRequest } from './auth.types.js';
import { extractBearerToken } from './session-token.js';

/** Requires a valid session token and exposes it to handlers via `@CurrentAuth()`. */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);
    const auth = token ? await this.auth.authenticate(token) : null;
    if (!auth) {
      throw new UnauthorizedException('Sign in to continue');
    }
    request.auth = auth;
    return true;
  }
}
