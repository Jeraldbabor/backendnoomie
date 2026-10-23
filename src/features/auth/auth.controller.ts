import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthContext } from './auth.types.js';
import { AuthService } from './auth.service.js';
import { CurrentAuth } from './current-auth.decorator.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { DeleteAccountDto } from './dto/delete-account.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { SessionAuthGuard } from './session-auth.guard.js';

@ApiTags('auth')
@Controller('auth')
// Stricter than the global limit, to slow down password guessing (per IP, per route).
@Throttle({ default: { limit: 10, ttl: 60_000 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  me(@CurrentAuth() auth: AuthContext) {
    return auth.user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  logout(@CurrentAuth() auth: AuthContext) {
    return this.authService.logout(auth.sessionId);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  logoutAll(@CurrentAuth() auth: AuthContext) {
    return this.authService.logoutAll(auth.user.id);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentAuth() auth: AuthContext,
  ) {
    return this.authService.changePassword(auth, dto);
  }

  // POST with the password in the body: some HTTP clients and proxies drop DELETE bodies.
  @Post('delete-account')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  deleteAccount(
    @Body() dto: DeleteAccountDto,
    @CurrentAuth() auth: AuthContext,
  ) {
    return this.authService.deleteAccount(auth.user.id, dto.password);
  }
}
