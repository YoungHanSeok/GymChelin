import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHmac, randomInt } from 'crypto';
import { hashPassword, verifyPassword } from '../common/password';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ConfirmEmailVerificationDto } from './dto/confirm-email-verification.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { FindIdDto } from './dto/find-id.dto';
import { FindPasswordDto } from './dto/find-password.dto';
import { UserMailService } from './user-mail.service';

const USER_LIMITS = {
  email: 120,
  username: 30,
  password: 72,
} as const;
const EMAIL_VERIFICATION_TTL_SECONDS = 60 * 10;

const ALLOWED_EMAIL_TLDS = new Set([
  'com',
  'net',
  'org',
  'kr',
  'co',
  'io',
  'dev',
  'app',
  'ai',
  'me',
  'edu',
  'gov',
]);

const hasAllowedEmailTld = (email: string) => {
  const domain = email.split('@')[1];
  if (!domain) {
    return false;
  }

  const lastLabel = domain.split('.').pop()?.toLowerCase();
  return !!lastLabel && ALLOWED_EMAIL_TLDS.has(lastLabel);
};

const normalizeUsername = (username: string) => username.trim();
const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizeEmailVerificationCode = (code: string) => code.trim();

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly userMailService: UserMailService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const email = normalizeEmail(createUserDto.email);
    const username = normalizeUsername(createUserDto.username);
    const nickname = normalizeUsername(
      createUserDto.nickname ?? createUserDto.username,
    );
    const password = createUserDto.password;
    const confirmPassword = createUserDto.confirmPassword;

    this.validateLocalSignup({
      email,
      username,
      nickname,
      password,
      confirmPassword,
    });

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }, { nickname }],
      },
      select: {
        email: true,
        username: true,
        nickname: true,
      },
    });

    if (existingUser?.email === email) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    if (existingUser?.username === username) {
      throw new ConflictException('이미 사용 중인 아이디입니다.');
    }

    if (existingUser?.nickname === nickname) {
      throw new ConflictException('이미 사용 중인 닉네임입니다.');
    }

    return this.prisma.user.create({
      data: {
        email,
        username,
        nickname,
        password: hashPassword(password),
      },
      select: this.publicSelect(),
    });
  }

  findAll() {
    return this.prisma.user.findMany({
      where: { deleteYN: 'N' },
      select: this.publicSelect(),
      orderBy: { createdAt: 'desc' },
    });
  }

  findByUsername(username: string) {
    return this.prisma.user.findFirst({
      where: {
        deleteYN: 'N',
        username: username.trim(),
      },
    });
  }

  async requestUsernameReminder(dto: FindIdDto) {
    const email = normalizeEmail(dto.email ?? '');
    this.validateLookupEmail(email);

    const user = await this.prisma.user.findFirst({
      where: {
        email,
        deleteYN: 'N',
      },
      select: {
        email: true,
        username: true,
      },
    });

    if (user) {
      await this.userMailService.verifyConnection();
      await this.userMailService.sendMail({
        to: user.email,
        subject: '[gymchelin] 아이디 찾기',
        text: [
          '요청하신 아이디는 아래와 같습니다.',
          '',
          `아이디: ${user.username}`,
          '',
          '본인이 요청하지 않았다면 이 메일을 무시해 주세요.',
        ].join('\n'),
      });
    }

    return {
      message: '가입 정보가 확인되면 이메일로 아이디를 안내해 드립니다.',
    };
  }

  async requestInitialPassword(dto: FindPasswordDto) {
    const email = normalizeEmail(dto.email ?? '');
    const username = normalizeUsername(dto.username ?? '');
    this.validateLookupEmail(email);
    this.validateLookupUsername(username);

    const user = await this.prisma.user.findFirst({
      where: {
        email,
        username,
        deleteYN: 'N',
        password: {
          not: null,
        },
      },
      select: {
        id: true,
        email: true,
        password: true,
        passwordReset: true,
        changePwAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(
        '아이디와 이메일이 일치하는 계정을 찾을 수 없습니다.',
      );
    }

    await this.userMailService.verifyConnection();

    const initialPassword = this.createInitialPassword();

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashPassword(initialPassword),
        changePwAt: new Date(),
        passwordReset: 'Y',
      },
    });

    try {
      await this.userMailService.sendMail({
        to: user.email,
        subject: '[gymchelin] 임시 비밀번호 안내',
        text: [
          '요청하신 비밀번호는 아래와 같이 임시 비밀번호로 변경되었습니다.',
          '',
          `임시 비밀번호: ${initialPassword}`,
          '',
          '로그인 후 반드시 새 비밀번호로 변경해 주세요.',
          '본인이 요청하지 않았다면 즉시 비밀번호를 다시 변경해 주세요.',
        ].join('\n'),
      });
    } catch (error) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: user.password,
          changePwAt: user.changePwAt,
          passwordReset: user.passwordReset,
        },
      });
      throw error;
    }

    return {
      message:
        '입력한 정보가 확인되면 이메일로 임시 비밀번호를 안내해 드립니다.',
    };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const currentPassword = dto.currentPassword ?? '';
    const newPassword = dto.newPassword ?? '';
    const confirmNewPassword = dto.confirmNewPassword ?? '';

    this.validatePasswordChange({
      currentPassword,
      newPassword,
      confirmNewPassword,
    });

    const user = await this.findActiveUserById(userId);

    if (!user?.password) {
      throw new BadRequestException(
        '비밀번호로 가입한 계정만 비밀번호를 변경할 수 있습니다.',
      );
    }

    if (!verifyPassword(currentPassword, user.password)) {
      throw new BadRequestException('현재 비밀번호가 올바르지 않습니다.');
    }

    if (verifyPassword(newPassword, user.password)) {
      throw new BadRequestException(
        '새 비밀번호는 현재 비밀번호와 다르게 입력해 주세요.',
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashPassword(newPassword),
        changePwAt: new Date(),
        passwordReset: 'N',
      },
      select: this.publicSelect(),
    });

    return {
      user: updatedUser,
      message: '비밀번호가 변경되었습니다.',
    };
  }

  async requestEmailVerification(userId: number) {
    const user = await this.findActiveUserById(userId);

    if (!user) {
      throw new BadRequestException('사용자를 찾을 수 없습니다.');
    }

    if (user.emailVerifiedAt) {
      return {
        alreadyVerified: true,
        message: '이미 인증된 이메일입니다.',
      };
    }

    const code = String(randomInt(100000, 1000000));

    await this.redisService.setJson(
      this.emailVerificationKey(user.id),
      {
        email: user.email,
        codeHash: this.hashEmailVerificationCode(code),
      },
      EMAIL_VERIFICATION_TTL_SECONDS,
    );

    return {
      alreadyVerified: false,
      expiresInSeconds: EMAIL_VERIFICATION_TTL_SECONDS,
      message:
        process.env.NODE_ENV === 'production'
          ? '인증 코드가 발급되었습니다. 메일 발송 연동 후 이메일로 안내됩니다.'
          : '개발 환경 인증 코드가 발급되었습니다.',
      devCode: process.env.NODE_ENV === 'production' ? undefined : code,
    };
  }

  async confirmEmailVerification(
    userId: number,
    dto: ConfirmEmailVerificationDto,
  ) {
    const code = normalizeEmailVerificationCode(dto.code ?? '');

    if (!/^\d{6}$/.test(code)) {
      throw new BadRequestException('6자리 인증 코드를 입력해 주세요.');
    }

    const user = await this.findActiveUserById(userId);

    if (!user) {
      throw new BadRequestException('사용자를 찾을 수 없습니다.');
    }

    if (user.emailVerifiedAt) {
      return {
        user: this.toPublicUserFromRecord(user),
        message: '이미 인증된 이메일입니다.',
      };
    }

    const verification = await this.redisService.getJson<{
      email: string;
      codeHash: string;
    }>(this.emailVerificationKey(user.id));

    if (!verification || verification.email !== user.email) {
      throw new BadRequestException(
        '인증 코드가 만료되었습니다. 다시 요청해 주세요.',
      );
    }

    if (verification.codeHash !== this.hashEmailVerificationCode(code)) {
      throw new BadRequestException('인증 코드가 올바르지 않습니다.');
    }

    await this.redisService.delete(this.emailVerificationKey(user.id));

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
      select: this.publicSelect(),
    });

    return {
      user: updatedUser,
      message: '이메일 인증이 완료되었습니다.',
    };
  }

  async withdraw(userId: number) {
    const user = await this.findActiveUserById(userId);

    if (!user) {
      return { ok: true };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        deleteYN: 'Y',
        deletedAt: new Date(),
      },
    });

    try {
      await this.redisService.delete(this.emailVerificationKey(user.id));
    } catch {
      return { ok: true };
    }

    return { ok: true };
  }

  publicSelect() {
    return {
      id: true,
      email: true,
      username: true,
      nickname: true,
      role: true,
      emailVerifiedAt: true,
      createdAt: true,
    } as const;
  }

  private findActiveUserById(userId: number) {
    return this.prisma.user.findFirst({
      where: {
        id: userId,
        deleteYN: 'N',
      },
    });
  }

  private validateLocalSignup(input: {
    email: string;
    username: string;
    nickname: string;
    password: string;
    confirmPassword: string;
  }) {
    const { email, username, nickname, password, confirmPassword } = input;

    if (!email || !username || !nickname || !password || !confirmPassword) {
      throw new BadRequestException('모든 값을 입력해 주세요.');
    }

    if (email.length > USER_LIMITS.email) {
      throw new BadRequestException(
        `이메일은 최대 ${USER_LIMITS.email}자까지 입력할 수 있습니다.`,
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('올바른 이메일 형식을 입력해 주세요.');
    }

    if (!hasAllowedEmailTld(email)) {
      throw new BadRequestException('지원하지 않는 이메일 도메인입니다.');
    }

    if (
      username.length > USER_LIMITS.username ||
      nickname.length > USER_LIMITS.username
    ) {
      throw new BadRequestException(
        `아이디와 닉네임은 최대 ${USER_LIMITS.username}자까지 입력할 수 있습니다.`,
      );
    }

    if (!/^[A-Za-z0-9_]+$/.test(username)) {
      throw new BadRequestException(
        '아이디는 영문, 숫자, 밑줄(_)만 사용할 수 있습니다.',
      );
    }

    if (password.length < 8 || password.length > USER_LIMITS.password) {
      throw new BadRequestException(
        `비밀번호는 8자 이상 ${USER_LIMITS.password}자 이하로 입력해 주세요.`,
      );
    }

    if (password !== confirmPassword) {
      throw new BadRequestException('비밀번호가 일치하지 않습니다.');
    }
  }

  private validatePasswordChange(input: {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }) {
    const { currentPassword, newPassword, confirmNewPassword } = input;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      throw new BadRequestException('모든 값을 입력해 주세요.');
    }

    if (newPassword.length < 8 || newPassword.length > USER_LIMITS.password) {
      throw new BadRequestException(
        `새 비밀번호는 8자 이상 ${USER_LIMITS.password}자 이하로 입력해 주세요.`,
      );
    }

    if (newPassword !== confirmNewPassword) {
      throw new BadRequestException('새 비밀번호가 일치하지 않습니다.');
    }
  }

  private validateLookupEmail(email: string) {
    if (!email) {
      throw new BadRequestException('이메일을 입력해 주세요.');
    }

    if (email.length > USER_LIMITS.email) {
      throw new BadRequestException(
        `이메일은 최대 ${USER_LIMITS.email}자까지 입력할 수 있습니다.`,
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('올바른 이메일 형식을 입력해 주세요.');
    }

    if (!hasAllowedEmailTld(email)) {
      throw new BadRequestException('지원하지 않는 이메일 도메인입니다.');
    }
  }

  private validateLookupUsername(username: string) {
    if (!username) {
      throw new BadRequestException('아이디를 입력해 주세요.');
    }

    if (username.length > USER_LIMITS.username) {
      throw new BadRequestException(
        `아이디는 최대 ${USER_LIMITS.username}자까지 입력할 수 있습니다.`,
      );
    }

    if (!/^[A-Za-z0-9_]+$/.test(username)) {
      throw new BadRequestException(
        '아이디는 영문, 숫자, 밑줄(_)만 사용할 수 있습니다.',
      );
    }
  }

  private createInitialPassword() {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const specialCharacters = '!@#$%^&*';
    const characters = [
      ...this.pickCharacters(lowercase, 4),
      ...this.pickCharacters(numbers, 3),
      ...this.pickCharacters(specialCharacters, 1),
    ];

    for (let index = characters.length - 1; index > 0; index -= 1) {
      const targetIndex = randomInt(0, index + 1);
      [characters[index], characters[targetIndex]] = [
        characters[targetIndex],
        characters[index],
      ];
    }

    return characters.join('');
  }

  private pickCharacters(source: string, count: number) {
    return Array.from({ length: count }, () => {
      return source[randomInt(0, source.length)] ?? source[0];
    });
  }

  private emailVerificationKey(userId: number) {
    return `users:email-verification:${userId}`;
  }

  private hashEmailVerificationCode(code: string) {
    return createHmac(
      'sha256',
      process.env.AUTH_SECRET ?? 'gymchelin-dev-secret',
    )
      .update(`email-verification:${code}`)
      .digest('base64url');
  }

  private toPublicUserFromRecord(user: {
    id: number;
    email: string;
    username: string;
    nickname: string;
    role: string;
    emailVerifiedAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      nickname: user.nickname,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
    };
  }
}
