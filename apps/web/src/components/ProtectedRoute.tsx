import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

type UserRole = 'CUSTOMER' | 'FABRIC_SELLER' | 'DESIGNER' | 'QA_TEAM' | 'ADMINISTRATOR';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user?.role) {
    if (!allowedRoles.includes(user.role as UserRole)) {
      // Redirect to appropriate dashboard based on role
      switch (user.role) {
        case 'ADMINISTRATOR':
          return <Navigate to="/admin" replace />;
        case 'FABRIC_SELLER':
          return <Navigate to="/seller" replace />;
        case 'DESIGNER':
          return <Navigate to="/designer" replace />;
        case 'QA_TEAM':
          return <Navigate to="/qa" replace />;
        default:
          return <Navigate to="/" replace />;
      }
    }
  }

  return <Outlet />;
}
