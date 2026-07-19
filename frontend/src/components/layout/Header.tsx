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

function getDateParts() {
  const today = new Date();

  return {
    day: new Intl.DateTimeFormat("en", { day: "2-digit" }).format(today),
    month: new Intl.DateTimeFormat("en", { month: "long" }).format(today),
    weekday: new Intl.DateTimeFormat("en", { weekday: "short" }).format(today),
  };
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
  const date = getDateParts();

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
        <div
          className="header-context"
          aria-label={`${date.weekday}, ${date.month} ${date.day}`}
        >
          <span className="header-date-number">{date.day}</span>
          <span className="header-date-copy">
            <strong>{date.weekday},</strong>
            <small>{date.month}</small>
          </span>
          <span className="header-workspace-title">{title}</span>
        </div>
      </div>

      <form className="header-search" onSubmit={submitSearch}>
        <Icon name="search" size={18} />
        <label className="sr-only" htmlFor="workspace-search">
          Search workspace navigation
        </label>
        <input
          id="workspace-search"
          list="workspace-search-options"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Start searching here…"
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
