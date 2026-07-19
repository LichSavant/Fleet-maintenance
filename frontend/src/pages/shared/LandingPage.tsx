import { Link } from "react-router-dom";

import { Card } from "../../components/ui/Card";
import { StatusBadge } from "../../components/ui/StatusBadge";

const roleSummaries = [
  ["Administrator", "System oversight and fleet governance"],
  ["Manager", "Assignments, schedules, and operations"],
  ["Mechanic", "Maintenance work and service history"],
  ["Driver", "Assigned vehicles, mileage, and reminders"],
] as const;

export default function LandingPage() {
  return (
    <main id="main-content">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <StatusBadge tone="warning">Frontend demonstration</StatusBadge>
          <p className="eyebrow">Fleet maintenance operations</p>
          <h1 id="landing-title">Keep every vehicle mission ready.</h1>
          <p>
            ForgeFleet brings vehicle readiness, maintenance coordination, and
            role-aware fleet work into one focused operational workspace.
          </p>
          <div className="landing-actions">
            <Link className="button button-primary button-large" to="/sign-in">
              Sign in
            </Link>
            <Link
              className="button button-secondary button-large"
              to="/sign-up"
            >
              Create account
            </Link>
          </div>
        </div>
        <aside className="landing-security-note" aria-label="Prototype notice">
          <p className="eyebrow">Designed for replacement</p>
          <h2>Frontend authentication only</h2>
          <p>
            This stage demonstrates session and role flows. It does not provide
            secure authentication or server authorization.
          </p>
        </aside>
      </section>

      <section className="landing-roles" aria-labelledby="roles-title">
        <div className="section-heading">
          <p className="eyebrow">Role-aware access</p>
          <h2 id="roles-title">One system, four operational perspectives</h2>
        </div>
        <div className="role-summary-grid">
          {roleSummaries.map(([role, description]) => (
            <Card as="article" key={role} title={role}>
              <p>{description}</p>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
