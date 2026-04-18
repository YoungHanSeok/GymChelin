import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@Controller('api')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users')
  findAll() {
    return this.usersService.findAll();
  }

  @Post('users')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
}
