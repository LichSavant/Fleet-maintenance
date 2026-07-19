import { forwardRef } from "react";
import { NavLink } from "react-router-dom";

import type { NavigationItem } from "../../types/navigation";
import { classNames } from "../../utils/classNames";
import { Icon } from "../ui/Icon";
import { BrandLogo } from "./BrandLogo";

export interface SidebarProps {
  isOpen: boolean;
  navigation: readonly NavigationItem[];
  onNavigate: () => void;
}

export const Sidebar = forwardRef<HTMLElement, SidebarProps>(
  ({ isOpen, navigation, onNavigate }, ref) => (
    <aside
      aria-label="Primary navigation"
      aria-modal={isOpen ? true : undefined}
      className={classNames("sidebar", isOpen && "sidebar-open")}
      id="primary-sidebar"
      ref={ref}
      role={isOpen ? "dialog" : undefined}
    >
      <div className="sidebar-heading">
        <BrandLogo />
        <button
          aria-label="Close sidebar navigation"
          className="icon-button sidebar-close-button"
          onClick={onNavigate}
          type="button"
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="sidebar-section-label">Main menu</div>
      <nav className="sidebar-navigation">
        {navigation.map((item) => (
          <NavLink
            className={({ isActive }) =>
              classNames("sidebar-link", isActive && "sidebar-link-active")
            }
            end={item.to.endsWith("/dashboard")}
            key={item.to}
            onClick={onNavigate}
            to={item.to}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer glass-panel">
        <span className="sidebar-footer-icon">
          <Icon name="shield" size={18} />
        </span>
        <div>
          <strong>Secure workspace</strong>
          <span>Role-based Supabase access</span>
        </div>
      </div>
    </aside>
  ),
);
Sidebar.displayName = "Sidebar";
