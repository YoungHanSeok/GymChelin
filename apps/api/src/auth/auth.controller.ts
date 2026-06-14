import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from './auth.guard';
import { AuthService, SESSION_COOKIE } from './auth.service';
import { CurrentUser } from './current-user.decorator';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() body: any, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.signup(body);
    response.cookie(SESSION_COOKIE, result.token, this.authService.createCookieOptions());

    return result;
  }

  @Post('login')
  async login(@Body() body: any, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login({
      loginId: body.loginId ?? body.email ?? body.username ?? '',
      password: body.password ?? '',
    });
    response.cookie(SESSION_COOKIE, result.token, this.authService.createCookieOptions());

    return result;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(SESSION_COOKIE, this.authService.clearCookieOptions());
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: any) {
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
    response.cookie(SESSION_COOKIE, result.token, this.authService.createCookieOptions());

    return result;
  }
}
