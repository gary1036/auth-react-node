import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { canAccessPath, type Role } from '../lib/roles';

export function ProtectedRoute() {
  const { isAuthenticated, loading, homePath } = useAuth();

  if (loading) {
    return <div className="page center">Loading session…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet context={{ homePath }} />;
}

export function RoleRoute({ roles }: { roles: readonly Role[] }) {
  const { user, loading, homePath } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="page center">Loading session…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role) || !canAccessPath(user.role, location.pathname)) {
    return <Navigate to="/forbidden" replace state={{ from: location.pathname, homePath }} />;
  }

  return <Outlet />;
}
