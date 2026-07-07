import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { AuthGuard } from './auth.guard';
import { AuthService, SESSION_COOKIE } from './auth.service';
import { CurrentUser } from './current-user.decorator';

type LoginBody = {
  loginId?: string;
  password?: string;
};

type PublicUser = {
  id: number;
  email: string;
  username: string;
  nickname: string;
  role: string;
  createdAt: Date;
};

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() body: CreateUserDto) {
    return this.authService.signup(body);
  }

  @Post('login')
  async login(
    @Body() body: LoginBody,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login({
      loginId: body.loginId ?? '',
      password: body.password ?? '',
    });
    response.cookie(
      SESSION_COOKIE,
      result.token,
      this.authService.createCookieOptions(),
    );

    return result;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(SESSION_COOKIE, this.authService.clearCookieOptions());
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: PublicUser) {
    return user;
  }

  @Get('oauth/:provider')
  oauth(@Param('provider') provider: string) {
    return this.authService.getOAuthAuthorization(provider);
  }

  @Get('oauth/:provider/callback')
  async oauthCallback(
    @Param('provider') provider: string,
    @Query('code') code: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.handleOAuthCallback(provider, code);
    response.cookie(
      SESSION_COOKIE,
      result.token,
      this.authService.createCookieOptions(),
    );

    return result;
  }
}
