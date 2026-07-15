// 최고 관리자의 관리자 계정 조회와 임명 API를 제공한다.
import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { AdminUsersService } from './admin-users.service';

type AdminUserQuery = {
  page?: string;
  take?: string;
  searchType?: string;
  keyword?: string;
  roleFilter?: string;
};

type AdminRoleUpdateBody = {
  updates?: unknown;
};

@Controller('api/admin/users')
@UseGuards(SuperAdminGuard)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  findAll(@Query() query: AdminUserQuery) {
    return this.adminUsersService.findAll(query);
  }

  @Patch('roles')
  updateRoles(@Body() body: AdminRoleUpdateBody) {
    return this.adminUsersService.updateRoles(body);
  }
}
