import { UserRole } from './db';

export const Permissions = {
  ADMIN_ACCESS: 'admin:access',
  CUSTOMER_ACCESS: 'customer:access',
  SELLER_ACCESS: 'seller:access',
  DESIGNER_ACCESS: 'designer:access',
  QA_ACCESS: 'qa:access',
  ORDERS_CREATE: 'orders:create',
  ORDERS_READ_SELF: 'orders:read:self',
  ORDERS_READ_ASSIGNED: 'orders:read:assigned',
  ORDERS_READ_ALL: 'orders:read:all',
  ORDERS_UPDATE_SELF: 'orders:update:self',
  ORDERS_UPDATE_ASSIGNED: 'orders:update:assigned',
  ORDERS_UPDATE_ALL: 'orders:update:all',
  PAYMENTS_CREATE: 'payments:create',
  UPLOADS_CREATE: 'uploads:create',
  HOMEPAGE_MANAGE: 'homepage:manage',
  BANNERS_MANAGE: 'banners:manage',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];
type PermissionGrant = Permission | '*';

export const ROLE_HOME_ROUTE: Record<UserRole, string> = {
  [UserRole.CUSTOMER]: '/dashboard',
  [UserRole.FABRIC_SELLER]: '/seller',
  [UserRole.FASHION_DESIGNER]: '/designer',
  [UserRole.QA_TEAM]: '/qa',
  [UserRole.ADMINISTRATOR]: '/admin',
};

export const ROLE_PERMISSIONS: Record<UserRole, PermissionGrant[]> = {
  [UserRole.ADMINISTRATOR]: ['*'],
  [UserRole.CUSTOMER]: [
    Permissions.CUSTOMER_ACCESS,
    Permissions.ORDERS_CREATE,
    Permissions.ORDERS_READ_SELF,
    Permissions.PAYMENTS_CREATE,
    Permissions.UPLOADS_CREATE,
  ],
  [UserRole.FABRIC_SELLER]: [
    Permissions.SELLER_ACCESS,
    Permissions.ORDERS_READ_ASSIGNED,
    Permissions.ORDERS_UPDATE_SELF,
    Permissions.UPLOADS_CREATE,
  ],
  [UserRole.FASHION_DESIGNER]: [
    Permissions.DESIGNER_ACCESS,
    Permissions.ORDERS_READ_ASSIGNED,
    Permissions.ORDERS_UPDATE_SELF,
    Permissions.UPLOADS_CREATE,
  ],
  [UserRole.QA_TEAM]: [
    Permissions.QA_ACCESS,
    Permissions.ORDERS_READ_ASSIGNED,
    Permissions.ORDERS_UPDATE_ASSIGNED,
    Permissions.UPLOADS_CREATE,
  ],
};

export function getRolePermissions(role: UserRole): PermissionGrant[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const grants = getRolePermissions(role);
  return grants.includes('*') || grants.includes(permission);
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  if (permissions.length === 0) {
    return true;
  }
  return permissions.some((permission) => hasPermission(role, permission));
}
