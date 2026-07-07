import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

const ADMIN_EMAIL = 'sywsyw159@naver.com';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const user = await this.authService.getUserFromRequest(request);

    if (!user) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }

    if (user.role !== 'ADMIN' && user.email.toLowerCase() !== ADMIN_EMAIL) {
      throw new ForbiddenException('관리자 권한이 필요합니다.');
    }

    request.user = user;
    return true;
  }
}
