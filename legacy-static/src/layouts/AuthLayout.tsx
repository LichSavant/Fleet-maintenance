import { Link, Outlet, useLocation } from "react-router-dom";

import truckImage from "../assets/forgefleet-truck-hero.jpg";
import { BrandLogo } from "../components/layout/BrandLogo";

export function AuthLayout() {
  const location = useLocation();
  const isSignUp = location.pathname.includes("sign-up");
  return (
    <main className="auth-layout" id="main-content">
      <section className="auth-identity" aria-labelledby="auth-identity-title">
        <img src={truckImage} alt="Freight truck on a mountain route" />
        <div className="auth-identity-overlay" />
        <div className="auth-identity-content">
          <BrandLogo inverted />
          <div>
            <p className="auth-kicker">
              {isSignUp ? "Create your account" : "Welcome back"}
            </p>
            <h1 id="auth-identity-title">
              {isSignUp
                ? "Join ForgeFleet and streamline fleet operations."
                : "Continue managing your fleet with confidence."}
            </h1>
            <p>
              Secure role-aware access for administrators, managers, mechanics,
              and drivers.
            </p>
          </div>
          <Link className="auth-home-link" to="/">
            ← Back to home
          </Link>
        </div>
      </section>
      <section className="auth-content" aria-label="Authentication">
        <Outlet />
      </section>
    </main>
  );
}
