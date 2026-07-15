// 회원 정보, 이메일 인증, 계정 찾기 API를 제공한다.
import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ConfirmEmailVerificationDto } from './dto/confirm-email-verification.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

type RequestUser = {
  id: number;
};

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

  @Patch('users/me/password')
  @UseGuards(AuthGuard)
  changePassword(
    @CurrentUser() user: RequestUser,
    @Body() body: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.id, body);
  }

  @Post('users/me/email-verification')
  @UseGuards(AuthGuard)
  requestEmailVerification(@CurrentUser() user: RequestUser) {
    return this.usersService.requestEmailVerification(user.id);
  }

  @Post('users/me/email-verification/confirm')
  @UseGuards(AuthGuard)
  confirmEmailVerification(
    @CurrentUser() user: RequestUser,
    @Body() body: ConfirmEmailVerificationDto,
  ) {
    return this.usersService.confirmEmailVerification(user.id, body);
  }

  @Delete('users/me')
  @UseGuards(AuthGuard)
  withdraw(@CurrentUser() user: RequestUser) {
    return this.usersService.withdraw(user.id);
  }
}
