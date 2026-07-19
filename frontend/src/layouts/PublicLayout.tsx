import { NavLink, Outlet } from "react-router-dom";

const publicNavigation = [
  ["/", "Home"],
  ["/sign-in", "Sign in"],
  ["/sign-up", "Create account"],
] as const;

export function PublicLayout() {
  return (
    <div className="public-layout">
      <header className="public-header">
        <NavLink aria-label="ForgeFleet home" className="public-brand" to="/">
          <span className="brand-mark" aria-hidden="true">
            FF
          </span>
          <span>ForgeFleet</span>
        </NavLink>
        <nav aria-label="Public navigation">
          {publicNavigation.map(([to, label]) => (
            <NavLink
              className={({ isActive }) =>
                isActive ? "public-link public-link-active" : "public-link"
              }
              end={to === "/"}
              key={to}
              to={to}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
