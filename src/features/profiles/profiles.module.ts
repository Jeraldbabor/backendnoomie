import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ProfilesController } from './profiles.controller.js';
import { ProfilesService } from './profiles.service.js';

@Module({
  // AuthModule provides SessionAuthGuard's AuthService for the /profiles/me routes.
  imports: [AuthModule],
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
