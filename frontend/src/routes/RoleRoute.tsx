import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types/auth";

export interface RoleRouteProps {
  allowedRoles: readonly UserRole[];
}

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { session } = useAuth();
  const location = useLocation();

  if (!session) {
    return (
      <Navigate replace state={{ from: location.pathname }} to="/sign-in" />
    );
  }

  if (!allowedRoles.includes(session.user.role)) {
    return (
      <Navigate
        replace
        state={{ attemptedPath: location.pathname }}
        to="/unauthorized"
      />
    );
  }

  return <Outlet />;
}
