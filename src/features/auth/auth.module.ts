import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PasswordService } from './password.service.js';
import { SessionAuthGuard } from './session-auth.guard.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, PasswordService, SessionAuthGuard],
  // Other features protect routes with @UseGuards(SessionAuthGuard) + @CurrentAuth().
  exports: [AuthService, SessionAuthGuard],
})
export class AuthModule {}
