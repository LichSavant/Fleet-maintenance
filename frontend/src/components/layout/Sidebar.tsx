import { forwardRef } from "react";
import { NavLink } from "react-router-dom";

import type { NavigationItem } from "../../types/navigation";
import { classNames } from "../../utils/classNames";
import { Icon } from "../ui/Icon";

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
        <LinkBrand />
        <button
          aria-label="Close sidebar navigation"
          className="icon-button sidebar-close-button"
          onClick={onNavigate}
          type="button"
        >
          <Icon name="close" />
        </button>
      </div>
      <nav className="sidebar-navigation">
        {navigation.map((item) => (
          <NavLink
            className={({ isActive }) =>
              classNames("sidebar-link", isActive && "sidebar-link-active")
            }
            end={item.to === "/"}
            key={item.to}
            onClick={onNavigate}
            to={item.to}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <p>Frontend authentication</p>
        <span>Demonstration only</span>
      </div>
    </aside>
  ),
);

Sidebar.displayName = "Sidebar";

function LinkBrand() {
  return (
    <NavLink aria-label="ForgeFleet home" className="sidebar-brand" end to="/">
      <span className="brand-mark" aria-hidden="true">
        FF
      </span>
      <span>
        <strong>ForgeFleet</strong>
        <small>Fleet control</small>
      </span>
    </NavLink>
  );
}
