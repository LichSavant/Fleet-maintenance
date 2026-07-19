import { Link } from "react-router-dom";

import truckImage from "../../assets/forgefleet-truck-hero.jpg";
import { Icon } from "../../components/ui/Icon";

const capabilities = [
  {
    icon: "users" as const,
    title: "Role-based access",
    detail: "Four operational workspaces",
  },
  {
    icon: "truck" as const,
    title: "Fleet control",
    detail: "Vehicles and assignments",
  },
  {
    icon: "wrench" as const,
    title: "Maintenance workflow",
    detail: "Schedules to service history",
  },
  {
    icon: "shield" as const,
    title: "Secure by design",
    detail: "Supabase Auth and RLS",
  },
];

const roles = [
  [
    "Administrator",
    "Users, fleet governance, service configuration, and reports.",
  ],
  [
    "Manager",
    "Drivers, mechanics, assignments, schedules, work orders, and reports.",
  ],
  ["Mechanic", "Assigned work orders and verified service history."],
  [
    "Driver",
    "Mileage submissions, maintenance reminders, and service history.",
  ],
] as const;

export default function LandingPage() {
  return (
    <main id="main-content" className="premium-landing">
      <section
        className="landing-hero"
        id="platform"
        aria-labelledby="landing-title"
      >
        <img
          className="landing-hero-image"
          src={truckImage}
          alt="ForgeFleet freight vehicle"
        />
        <div className="landing-hero-overlay" />
        <div className="landing-hero-copy">
          <p className="landing-kicker">Fleet maintenance management</p>
          <h1 id="landing-title">
            Smarter Fleets.
            <br />
            Stronger Operations.
          </h1>
          <p>
            Manage users, vehicles, assignments, mileage, maintenance schedules,
            work orders, service history, and reports in one secure platform.
          </p>
          <div className="landing-actions">
            <Link
              className="landing-button landing-button-primary"
              to="/sign-in"
            >
              Sign in <span>→</span>
            </Link>
            <Link
              className="landing-button landing-button-secondary"
              to="/sign-up"
            >
              Sign up <span>→</span>
            </Link>
          </div>
        </div>
        <div className="landing-capability-strip" id="capabilities">
          {capabilities.map((item) => (
            <article
              className="landing-capability glass-panel"
              key={item.title}
            >
              <span>
                <Icon name={item.icon} size={20} />
              </span>
              <div>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="roles">
        <div className="landing-section-heading">
          <span>Purpose-built workspaces</span>
          <h2>One platform. Complete fleet control.</h2>
          <p>
            Each role sees only the tools and records required by the project
            scope.
          </p>
        </div>
        <div className="landing-role-grid">
          {roles.map(([title, detail], index) => (
            <article className="glass-panel" key={title}>
              <span>0{index + 1}</span>
              <h3>{title}</h3>
              <p>{detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-security" id="security">
        <div>
          <span className="landing-security-icon">
            <Icon name="shield" size={26} />
          </span>
          <div>
            <h2>Backend-enforced access</h2>
            <p>
              Authentication, database authorization, integrity rules, and role
              filtering are enforced in Supabase—not only hidden in the
              interface.
            </p>
          </div>
        </div>
        <Link to="/sign-in">
          Open your workspace <span>→</span>
        </Link>
      </section>
    </main>
  );
}
