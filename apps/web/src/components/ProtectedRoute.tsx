import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { UserRole } from '../types';
import { getHomeRouteForRole, normalizeRole } from '../auth/rbac';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const normalizedRole = normalizeRole(user?.role);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    if (!normalizedRole) {
      return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(normalizedRole)) {
      return <Navigate to={getHomeRouteForRole(normalizedRole)} replace />;
    }
  }

  return <Outlet />;
}
