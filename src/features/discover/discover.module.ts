import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DiscoverController } from './discover.controller.js';
import { DiscoverService } from './discover.service.js';

@Module({
  // AuthModule provides OptionalSessionAuthGuard's AuthService. Recipe shapes come from
  // recipes.types.ts, the recipes feature's public response contract.
  imports: [AuthModule],
  controllers: [DiscoverController],
  providers: [DiscoverService],
})
export class DiscoverModule {}
