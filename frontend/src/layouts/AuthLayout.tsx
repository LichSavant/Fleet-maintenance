import { Link, Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <main className="auth-layout" id="main-content">
      <section className="auth-identity" aria-labelledby="auth-identity-title">
        <Link aria-label="ForgeFleet home" className="auth-brand" to="/">
          <span className="brand-mark" aria-hidden="true">
            FF
          </span>
          <span>ForgeFleet</span>
        </Link>
        <div>
          <p className="eyebrow">Fleet maintenance operations</p>
          <h1 id="auth-identity-title">Keep every vehicle mission ready.</h1>
          <p>
            Role-aware access for administrators, managers, mechanics, and
            drivers.
          </p>
        </div>
      </section>
      <section className="auth-content" aria-label="Authentication">
        <Outlet />
      </section>
    </main>
  );
}
