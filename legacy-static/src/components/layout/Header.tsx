import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import type { NavigationItem } from "../../types/navigation";
import { Icon } from "../ui/Icon";
import { BrandLogo } from "./BrandLogo";

export interface HeaderProps {
  actions?: ReactNode;
  menuExpanded: boolean;
  navigation: readonly NavigationItem[];
  onMenuToggle: () => void;
  title?: string;
}

export function Header({
  actions,
  menuExpanded,
  navigation,
  onMenuToggle,
  title = "Fleet operations",
}: HeaderProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = query.trim().toLowerCase();
    if (!normalized) return;
    const destination = navigation.find(
      (item) =>
        item.label.toLowerCase() === normalized ||
        item.label.toLowerCase().includes(normalized),
    );
    if (destination) {
      navigate(destination.to);
      setQuery("");
    }
  };

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
        <div className="mobile-brand">
          <BrandLogo compact />
        </div>
        <div className="header-context">
          <span>ForgeFleet</span>
          <strong>{title}</strong>
        </div>
      </div>

      <form className="header-search" onSubmit={submitSearch}>
        <Icon name="search" size={17} />
        <label className="sr-only" htmlFor="workspace-search">
          Search workspace navigation
        </label>
        <input
          id="workspace-search"
          list="workspace-search-options"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search workspace…"
          value={query}
        />
        <datalist id="workspace-search-options">
          {navigation.map((item) => (
            <option key={item.to} value={item.label} />
          ))}
        </datalist>
      </form>

      {actions && <div className="header-actions">{actions}</div>}
    </header>
  );
}
