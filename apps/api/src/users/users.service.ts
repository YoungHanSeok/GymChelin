import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { hashPassword } from '../common/password';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

const USER_LIMITS = {
  email: 120,
  username: 30,
  password: 72,
} as const;

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

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const email = createUserDto.email.trim().toLowerCase();
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

  publicSelect() {
    return {
      id: true,
      email: true,
      username: true,
      nickname: true,
      role: true,
      createdAt: true,
    } as const;
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
}
