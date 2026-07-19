import { Link } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import { getRoleDashboardPath } from "../../utils/roleRoutes";

export default function UnauthorizedPage() {
  const { user } = useAuth();
  const destination = user ? getRoleDashboardPath(user.role) : "/sign-in";

  return (
    <main className="status-page" id="main-content">
      <section className="status-card" aria-labelledby="unauthorized-title">
        <p className="eyebrow">Access restricted</p>
        <h1 id="unauthorized-title">
          This workspace is not available to your role.
        </h1>
        <p>
          {user
            ? `You are signed in as ${user.fullName} with the ${user.role} role.`
            : "Sign in with an account that has access to the requested workspace."}
        </p>
        <Link className="button button-primary button-medium" to={destination}>
          {user ? "Return to my dashboard" : "Go to sign in"}
        </Link>
      </section>
    </main>
  );
}
