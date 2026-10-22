import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthContext, AuthenticatedRequest } from './auth.types.js';

/**
 * The signed-in user and session. Always set behind SessionAuthGuard. Behind
 * OptionalSessionAuthGuard it is undefined for anonymous requests, so type the parameter
 * as `AuthContext | undefined` there.
 */
export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthContext =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().auth,
);
