// 관리자와 최고 관리자의 역할 판별 기준을 한 곳에서 관리한다.
const ADMIN_ROLE = 'ADMIN';
const SUPER_ADMIN_ROLE = 'SUPER_ADMIN';

export const isAdminRole = (role?: string | null) =>
  role === ADMIN_ROLE;

export const isSuperAdminRole = (role?: string | null) =>
  role === SUPER_ADMIN_ROLE;
