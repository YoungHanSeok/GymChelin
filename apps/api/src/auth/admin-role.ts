const ADMIN_ROLE = 'ADMIN';
const SUPER_ADMIN_ROLE = 'SUPER_ADMIN';

export const isAdminRole = (role?: string | null) =>
  role === ADMIN_ROLE;

export const isSuperAdminRole = (role?: string | null) =>
  role === SUPER_ADMIN_ROLE;
