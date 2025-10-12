import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service'; // PrismaService import

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {} // 생성자에서 PrismaService 주입

  findAll() {
    return this.prisma.user.findMany(); // 모든 유저를 찾아 반환
  }
}