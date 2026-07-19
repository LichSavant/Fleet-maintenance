import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { Icon } from "../ui/Icon";

export interface HeaderProps {
  actions?: ReactNode;
  menuExpanded: boolean;
  onMenuToggle: () => void;
  title?: string;
}

export function Header({
  actions,
  menuExpanded,
  onMenuToggle,
  title = "Fleet operations",
}: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-start">
        <button
          aria-controls="primary-sidebar"
          aria-expanded={menuExpanded}
          aria-label={menuExpanded ? "Close navigation" : "Open navigation"}
          className="icon-button mobile-menu-button"
          onClick={onMenuToggle}
          type="button"
        >
          <Icon name={menuExpanded ? "close" : "menu"} />
        </button>
        <Link aria-label="ForgeFleet home" className="mobile-brand" to="/">
          <span className="brand-mark" aria-hidden="true">
            FF
          </span>
        </Link>
        <div className="header-context">
          <span>ForgeFleet</span>
          <strong>{title}</strong>
        </div>
      </div>
      {actions && <div className="header-actions">{actions}</div>}
    </header>
  );
}
