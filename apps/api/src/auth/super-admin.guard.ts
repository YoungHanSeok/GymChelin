// 최고 관리자 전용 요청을 차단한다.
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { isSuperAdminRole } from './admin-role';
import { AuthService } from './auth.service';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const user = await this.authService.getUserFromRequest(request);

    if (!user) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }

    if (!isSuperAdminRole(user.role)) {
      throw new ForbiddenException('최고 관리자 권한이 필요합니다.');
    }

    request.user = user;
    return true;
  }
}
