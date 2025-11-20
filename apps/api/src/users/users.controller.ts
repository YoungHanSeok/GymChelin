import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('api/users') // 라우팅 경로를 '/users'로 설정
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  
  @Get() // GET 요청 핸들러
  findAll() {
    console.log('UsersController: findAll called');
    return this.usersService.findAll();
  }
}