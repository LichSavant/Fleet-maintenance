import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { getRoleDashboardPath } from "../utils/roleRoutes";

export function PublicOnlyRoute() {
  const { session } = useAuth();

  if (session) {
    return <Navigate replace to={getRoleDashboardPath(session.user.role)} />;
  }

  return <Outlet />;
}
