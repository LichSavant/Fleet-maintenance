import { Link } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { getRoleDashboardPath } from "../utils/roleRoutes";

export default function NotFoundPage() {
  const { user } = useAuth();
  const destination = user ? getRoleDashboardPath(user.role) : "/";

  return (
    <main className="status-page" id="main-content">
      <section className="status-card" aria-labelledby="not-found-title">
        <p className="eyebrow">404 error</p>
        <h1 id="not-found-title">Page not found</h1>
        <p>The requested ForgeFleet route does not exist.</p>
        <Link className="button button-primary button-medium" to={destination}>
          {user ? "Return to my dashboard" : "Return home"}
        </Link>
      </section>
    </main>
  );
}
