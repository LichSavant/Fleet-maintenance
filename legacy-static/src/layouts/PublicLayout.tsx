import { Link, Outlet } from "react-router-dom";

import { BrandLogo } from "../components/layout/BrandLogo";

export function PublicLayout() {
  return (
    <div className="public-layout">
      <header className="public-header">
        <BrandLogo inverted />
        <nav aria-label="Public navigation" className="public-navigation">
          <a href="/#platform">Platform</a>
          <a href="/#roles">Roles</a>
          <a href="/#capabilities">Capabilities</a>
          <a href="/#security">Security</a>
        </nav>
        <div className="public-auth-actions">
          <Link className="public-sign-in" to="/sign-in">
            Sign in
          </Link>
          <Link className="public-sign-up" to="/sign-up">
            Sign up
          </Link>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
