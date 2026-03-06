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

export function isCustomerRole(role: string | undefined | null): boolean {
  return normalizeRole(role) === 'CUSTOMER';
}

export function getVendorStorePath(role: 'seller' | 'designer', vendorId: string): string {
  return `/store/${role}/${vendorId}`;
}

export function getVendorStorePathForRole(
  role: string | undefined | null,
  vendorId: string | undefined | null
): string | null {
  if (!vendorId) {
    return null;
  }
  const normalized = normalizeRole(role);
  if (normalized === 'FABRIC_SELLER') {
    return getVendorStorePath('seller', vendorId);
  }
  if (normalized === 'FASHION_DESIGNER') {
    return getVendorStorePath('designer', vendorId);
  }
  return null;
}
