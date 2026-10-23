import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FollowsController } from './follows.controller.js';
import { FollowsService } from './follows.service.js';

@Module({
  // AuthModule provides the session guards' AuthService. Profile shapes come from
  // profiles.types.ts, the profiles feature's public response contract.
  imports: [AuthModule],
  controllers: [FollowsController],
  providers: [FollowsService],
})
export class FollowsModule {}
