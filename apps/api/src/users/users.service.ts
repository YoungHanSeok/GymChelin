import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { randomBytes, scryptSync } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

const USER_LIMITS = {
  email: 30,
  username: 15,
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

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const email = createUserDto.email.trim().toLowerCase();
    const username = createUserDto.username.trim();
    const password = createUserDto.password;
    const confirmPassword = createUserDto.confirmPassword;

    if (!email || !username || !password || !confirmPassword) {
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

    if (username.length > USER_LIMITS.username) {
      throw new BadRequestException(
        `아이디는 최대 ${USER_LIMITS.username}자까지 입력할 수 있습니다.`,
      );
    }

    if (!/^[A-Za-z0-9_]+$/.test(username)) {
      throw new BadRequestException('아이디는 영문, 숫자, 밑줄(_)만 사용할 수 있습니다.');
    }

    if (password.length < 8 || password.length > USER_LIMITS.password) {
      throw new BadRequestException(
        `비밀번호는 8자 이상 ${USER_LIMITS.password}자 이하여야 합니다.`,
      );
    }

    if (password !== confirmPassword) {
      throw new BadRequestException('비밀번호가 일치하지 않습니다.');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }, { nickname: username }],
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

    if (existingUser?.username === username || existingUser?.nickname === username) {
      throw new ConflictException('이미 사용 중인 아이디입니다.');
    }

    const salt = randomBytes(16).toString('hex');
    const passwordHash = scryptSync(password, salt, 64).toString('hex');

    return this.prisma.user.create({
      data: {
        email,
        username,
        password: `${salt}:${passwordHash}`,
        nickname: username,
      },
      select: {
        id: true,
        email: true,
        username: true,
        nickname: true,
        createdAt: true,
      },
    });
  }

  findAll() {
    return this.prisma.user.findMany();
  }
}
