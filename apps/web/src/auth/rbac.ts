import type { UserRole } from '../types';

export const ROLE_HOME_ROUTE: Record<UserRole, string> = {
  CUSTOMER: '/dashboard',
  FABRIC_SELLER: '/seller',
  FASHION_DESIGNER: '/designer',
  QA_TEAM: '/qa',
  ADMINISTRATOR: '/admin',
};

export function normalizeRole(role: string | undefined | null): UserRole | null {
  if (!role) {
    return null;
  }
  if (role === 'DESIGNER') {
    return 'FASHION_DESIGNER';
  }
  if (
    role === 'CUSTOMER' ||
    role === 'FABRIC_SELLER' ||
    role === 'FASHION_DESIGNER' ||
    role === 'QA_TEAM' ||
    role === 'ADMINISTRATOR'
  ) {
    return role;
  }
  return null;
}

export function getHomeRouteForRole(role: string | undefined | null): string {
  const normalized = normalizeRole(role);
  if (!normalized) {
    return '/';
  }
  return ROLE_HOME_ROUTE[normalized];
}
