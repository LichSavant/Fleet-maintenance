import { Navigate, Outlet, useLocation } from "react-router-dom";

import { LoadingFallback } from "../components/common/LoadingFallback";
import { useAuth } from "../hooks/useAuth";

export function ProtectedRoute() {
  const { isLoading, session } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingFallback />;

  if (!session) {
    return (
      <Navigate
        replace
        state={{ from: `${location.pathname}${location.search}` }}
        to="/sign-in"
      />
    );
  }

  return <Outlet />;
}
