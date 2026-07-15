// 회원 가입, 로그인, 토큰 갱신 API를 제공한다.
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { FindIdDto } from '../users/dto/find-id.dto';
import { FindPasswordDto } from '../users/dto/find-password.dto';
import { UsersService } from '../users/users.service';
import {
  ACCESS_TOKEN_COOKIE,
  AuthService,
  LEGACY_SESSION_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from './auth.service';

type LoginBody = {
  loginId?: string;
  password?: string;
};

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('signup')
  signup(@Body() body: CreateUserDto) {
    return this.authService.signup(body);
  }

  @Post('find-id')
  findId(@Body() body: FindIdDto) {
    return this.usersService.requestUsernameReminder(body);
  }

  @Post('find-password')
  findPassword(@Body() body: FindPasswordDto) {
    return this.usersService.requestInitialPassword(body);
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
    this.setAuthCookies(response, result);

    return { user: result.user };
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(request);
    this.clearAuthCookies(response);
    return { ok: true };
  }

  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.refreshAccessToken(request);

    if (!session) {
      this.clearAuthCookies(response);
      throw new UnauthorizedException('로그인이 필요합니다.');
    }

    response.cookie(
      ACCESS_TOKEN_COOKIE,
      session.accessToken,
      this.authService.createAccessCookieOptions(),
    );

    return { user: session.user };
  }

  @Get('me')
  async me(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.getSessionFromRequest(request);

    if (!session || !session.user) {
      this.clearAuthCookies(response);
      return null;
    }

    if ('accessToken' in session) {
      response.cookie(
        ACCESS_TOKEN_COOKIE,
        session.accessToken,
        this.authService.createAccessCookieOptions(),
      );
    }

    return session.user;
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
    this.setAuthCookies(response, result);

    return { user: result.user };
  }

  private setAuthCookies(
    response: Response,
    result: { accessToken: string; refreshToken: string },
  ) {
    response.cookie(
      ACCESS_TOKEN_COOKIE,
      result.accessToken,
      this.authService.createAccessCookieOptions(),
    );
    response.cookie(
      REFRESH_TOKEN_COOKIE,
      result.refreshToken,
      this.authService.createRefreshCookieOptions(),
    );
    response.clearCookie(
      LEGACY_SESSION_COOKIE,
      this.authService.clearCookieOptions(),
    );
  }

  private clearAuthCookies(response: Response) {
    response.clearCookie(
      ACCESS_TOKEN_COOKIE,
      this.authService.clearCookieOptions(),
    );
    response.clearCookie(
      REFRESH_TOKEN_COOKIE,
      this.authService.clearCookieOptions(),
    );
    response.clearCookie(
      LEGACY_SESSION_COOKIE,
      this.authService.clearCookieOptions(),
    );
  }
}
