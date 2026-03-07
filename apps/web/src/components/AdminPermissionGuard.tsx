import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getHomeRouteForRole } from '../auth/rbac';

interface AdminPermissionGuardProps {
  required?: string[];
  children: ReactNode;
}

export default function AdminPermissionGuard({ required = [], children }: AdminPermissionGuardProps) {
  const { user } = useAuthStore();
  const role = String(user?.role || '');
  if (role !== 'ADMINISTRATOR') {
    return <Navigate to={getHomeRouteForRole(role)} replace />;
  }

  if (required.length === 0) {
    return <>{children}</>;
  }

  const grants = Array.isArray((user as any)?.permissions) ? (((user as any).permissions as string[]) || []) : [];
  if (grants.length === 0 || grants.includes('*')) {
    return <>{children}</>;
  }

  const allowed = required.every((permission) => grants.includes(permission));
  if (!allowed) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
