import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthContext, AuthenticatedRequest } from './auth.types.js';

/** The signed-in user and session. Only valid on routes guarded by SessionAuthGuard. */
export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthContext =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().auth,
);
