import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthProvider, User } from '@prisma/client';
import { createHmac } from 'crypto';
import { verifyPassword } from '../common/password';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';

const SESSION_COOKIE = 'gymchelin_token';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

type SessionPayload = {
  sub: number;
  role: string;
  exp: number;
  jti: string;
};

type OAuthProfile = {
  providerUserId: string;
  email?: string;
  nickname?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async signup(dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    return this.withToken(user);
  }

  async login(input: { loginId: string; password: string }) {
    const user = await this.usersService.findByEmailOrUsername(input.loginId);

    if (!user || !verifyPassword(input.password, user.password)) {
      throw new UnauthorizedException(
        '아이디 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    return this.withToken(this.toPublicUser(user));
  }

  async me(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: this.usersService.publicSelect(),
    });
  }

  getOAuthAuthorization(providerParam: string) {
    const provider = this.parseProvider(providerParam);
    const config = this.getOAuthConfig(provider);

    if (!config.clientId || !config.redirectUri) {
      return {
        provider,
        setupRequired: true,
        message: `${provider} OAuth 환경변수가 설정되지 않았습니다.`,
        requiredEnv: config.requiredEnv,
      };
    }

    const params = new URLSearchParams(
      Object.entries(config.authorizationParams).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
    params.set('client_id', config.clientId);
    params.set('redirect_uri', config.redirectUri);
    params.set('response_type', 'code');

    return {
      provider,
      setupRequired: false,
      authUrl: `${config.authorizationUrl}?${params.toString()}`,
    };
  }

  async handleOAuthCallback(providerParam: string, code?: string) {
    if (!code) {
      throw new BadRequestException('OAuth 인증 코드가 없습니다.');
    }

    const provider = this.parseProvider(providerParam);
    const config = this.getOAuthConfig(provider);

    if (!config.clientId || !config.clientSecret || !config.redirectUri) {
      throw new BadRequestException(
        `${provider} OAuth 환경변수가 설정되지 않았습니다.`,
      );
    }

    const accessToken = await this.exchangeOAuthCode(config, code);
    const profile = await this.fetchOAuthProfile(
      provider,
      config.userInfoUrl,
      accessToken,
    );
    const user = await this.upsertOAuthUser(provider, profile);

    return this.withToken(user);
  }

  async getUserFromRequest(request: {
    headers?: Record<string, string | string[] | undefined>;
  }) {
    const token = this.extractToken(request);
    if (!token) {
      return null;
    }

    const payload = this.verifyToken(token);
    if (!payload) {
      return null;
    }

    return this.me(payload.sub);
  }

  createCookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_TTL_SECONDS * 1000,
      path: '/',
    };
  }

  clearCookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    };
  }

  private async exchangeOAuthCode(
    config: ReturnType<AuthService['getOAuthConfig']>,
    code: string,
  ) {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId ?? '',
      client_secret: config.clientSecret ?? '',
      redirect_uri: config.redirectUri ?? '',
      code,
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      throw new UnauthorizedException('OAuth 토큰 발급에 실패했습니다.');
    }

    const data = (await response.json()) as { access_token?: string };
    if (!data.access_token) {
      throw new UnauthorizedException('OAuth 응답에 access token이 없습니다.');
    }

    return data.access_token;
  }

  private async fetchOAuthProfile(
    provider: AuthProvider,
    userInfoUrl: string,
    accessToken: string,
  ): Promise<OAuthProfile> {
    const response = await fetch(userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new UnauthorizedException(
        'OAuth 사용자 정보를 가져오지 못했습니다.',
      );
    }

    const data = (await response.json()) as Record<string, any>;

    if (provider === AuthProvider.KAKAO) {
      return {
        providerUserId: String(data.id),
        email: data.kakao_account?.email,
        nickname:
          data.properties?.nickname ?? data.kakao_account?.profile?.nickname,
      };
    }

    if (provider === AuthProvider.NAVER) {
      return {
        providerUserId: String(data.response?.id),
        email: data.response?.email,
        nickname: data.response?.nickname ?? data.response?.name,
      };
    }

    return {
      providerUserId: String(data.id),
      email: data.email,
      nickname: data.name,
    };
  }

  private async upsertOAuthUser(provider: AuthProvider, profile: OAuthProfile) {
    if (!profile.providerUserId) {
      throw new UnauthorizedException('OAuth 사용자 식별자가 없습니다.');
    }

    const linkedAccount = await this.prisma.socialAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId: profile.providerUserId,
        },
      },
      include: { user: true },
    });

    if (linkedAccount) {
      return this.toPublicUser(linkedAccount.user);
    }

    const email =
      profile.email?.trim().toLowerCase() ??
      `${provider.toLowerCase()}_${profile.providerUserId}@oauth.gymchelin.local`;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      await this.prisma.socialAccount.create({
        data: {
          provider,
          providerUserId: profile.providerUserId,
          email,
          userId: existingUser.id,
        },
      });

      return this.toPublicUser(existingUser);
    }

    const baseHandle = this.normalizeHandle(
      profile.nickname ??
        email.split('@')[0] ??
        `${provider.toLowerCase()}_user`,
    );
    const username = await this.createUniqueHandle(baseHandle);
    const nickname = await this.createUniqueNickname(
      profile.nickname ?? username,
    );

    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        nickname,
        socialAccounts: {
          create: {
            provider,
            providerUserId: profile.providerUserId,
            email,
          },
        },
      },
    });

    return this.toPublicUser(user);
  }

  private async createUniqueHandle(base: string) {
    return this.createUniqueValue(base, async (value) => {
      const user = await this.prisma.user.findUnique({
        where: { username: value },
      });
      return !!user;
    });
  }

  private async createUniqueNickname(base: string) {
    return this.createUniqueValue(base, async (value) => {
      const user = await this.prisma.user.findUnique({
        where: { nickname: value },
      });
      return !!user;
    });
  }

  private async createUniqueValue(
    base: string,
    exists: (value: string) => Promise<boolean>,
  ) {
    const normalized = this.normalizeHandle(base);
    let candidate = normalized.slice(0, 30) || 'gymchelin';
    let index = 1;

    while (await exists(candidate)) {
      const suffix = String(index);
      candidate = `${normalized.slice(0, 30 - suffix.length)}${suffix}`;
      index += 1;
    }

    return candidate;
  }

  private normalizeHandle(value: string) {
    const normalized = value
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');

    return normalized || 'gymchelin';
  }

  private withToken<T extends { id: number; role: string }>(user: T) {
    return {
      token: this.createToken({ userId: user.id, role: user.role }),
      user,
    };
  }

  private createToken(input: { userId: number; role: string }) {
    const payload: SessionPayload = {
      sub: input.userId,
      role: input.role,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
      jti: `${input.userId}-${Date.now()}`,
    };
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
      'base64url',
    );
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );
    const signature = this.sign(`${encodedHeader}.${encodedPayload}`);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private verifyToken(token: string): SessionPayload | null {
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    if (
      !encodedHeader ||
      !encodedPayload ||
      !signature ||
      this.sign(`${encodedHeader}.${encodedPayload}`) !== signature
    ) {
      return null;
    }

    try {
      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString(),
      ) as SessionPayload;
      if (!payload.sub || payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  private extractToken(request: {
    headers?: Record<string, string | string[] | undefined>;
  }) {
    const authorization = request.headers?.authorization;
    const authorizationValue = Array.isArray(authorization)
      ? authorization[0]
      : authorization;

    if (authorizationValue?.startsWith('Bearer ')) {
      return authorizationValue.slice('Bearer '.length);
    }

    const cookieHeader = request.headers?.cookie;
    const cookieValue = Array.isArray(cookieHeader)
      ? cookieHeader.join(';')
      : cookieHeader;
    if (!cookieValue) {
      return null;
    }

    const cookies = cookieValue.split(';').map((cookie) => cookie.trim());
    const tokenCookie = cookies.find((cookie) =>
      cookie.startsWith(`${SESSION_COOKIE}=`),
    );

    return tokenCookie
      ? decodeURIComponent(tokenCookie.split('=').slice(1).join('='))
      : null;
  }

  private sign(value: string) {
    return createHmac(
      'sha256',
      process.env.AUTH_SECRET ?? 'gymchelin-dev-secret',
    )
      .update(value)
      .digest('base64url');
  }

  private parseProvider(providerParam: string) {
    const provider = providerParam.toUpperCase();
    if (!['KAKAO', 'NAVER', 'GOOGLE'].includes(provider)) {
      throw new BadRequestException('지원하지 않는 OAuth 제공자입니다.');
    }

    return provider as AuthProvider;
  }

  private getOAuthConfig(provider: AuthProvider) {
    if (provider === AuthProvider.KAKAO) {
      return {
        clientId: process.env.KAKAO_CLIENT_ID,
        clientSecret: process.env.KAKAO_CLIENT_SECRET,
        redirectUri: process.env.KAKAO_REDIRECT_URI,
        authorizationUrl: 'https://kauth.kakao.com/oauth/authorize',
        tokenUrl: 'https://kauth.kakao.com/oauth/token',
        userInfoUrl: 'https://kapi.kakao.com/v2/user/me',
        authorizationParams: {},
        requiredEnv: [
          'KAKAO_CLIENT_ID',
          'KAKAO_CLIENT_SECRET',
          'KAKAO_REDIRECT_URI',
        ],
      };
    }

    if (provider === AuthProvider.NAVER) {
      return {
        clientId: process.env.NAVER_CLIENT_ID,
        clientSecret: process.env.NAVER_CLIENT_SECRET,
        redirectUri: process.env.NAVER_REDIRECT_URI,
        authorizationUrl: 'https://nid.naver.com/oauth2.0/authorize',
        tokenUrl: 'https://nid.naver.com/oauth2.0/token',
        userInfoUrl: 'https://openapi.naver.com/v1/nid/me',
        authorizationParams: { state: 'gymchelin' },
        requiredEnv: [
          'NAVER_CLIENT_ID',
          'NAVER_CLIENT_SECRET',
          'NAVER_REDIRECT_URI',
        ],
      };
    }

    return {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      authorizationParams: {
        scope: 'openid email profile',
        access_type: 'offline',
      },
      requiredEnv: [
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        'GOOGLE_REDIRECT_URI',
      ],
    };
  }

  private toPublicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      nickname: user.nickname,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}

export { SESSION_COOKIE };
