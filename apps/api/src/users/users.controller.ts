import { Body, Controller, Get, Param, Post, Redirect } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('api') // 라우팅 경로를 '/users'로 설정
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  
  @Get('users') // GET 요청 핸들러
  findAll() {
    console.log('UsersController: findAll called');
    return this.usersService.findAll();
  }

  @Post('test')
  testRedirect(@Body() params: object) {
    console.log("type params : " + typeof(params));
    console.log('params : ' + params.toString());
    return params;
  }
}