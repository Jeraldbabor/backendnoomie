import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PasswordService } from './password.service.js';
import {
  OptionalSessionAuthGuard,
  SessionAuthGuard,
} from './session-auth.guard.js';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    SessionAuthGuard,
    OptionalSessionAuthGuard,
  ],
  // Other features protect routes with @UseGuards(SessionAuthGuard) + @CurrentAuth(), or
  // personalize public routes with OptionalSessionAuthGuard.
  exports: [AuthService, SessionAuthGuard, OptionalSessionAuthGuard],
})
export class AuthModule {}
