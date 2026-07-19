import { useEffect, useRef, useState, type ReactNode } from "react";
import { Outlet } from "react-router-dom";

import { Header } from "../components/layout/Header";
import { MobileNavigation } from "../components/layout/MobileNavigation";
import { Sidebar } from "../components/layout/Sidebar";
import type { NavigationItem } from "../types/navigation";

export interface DashboardLayoutProps {
  headerActions?: ReactNode;
  headerTitle?: string;
  navigation: readonly NavigationItem[];
}

export function DashboardLayout({
  headerActions,
  headerTitle,
  navigation,
}: DashboardLayoutProps) {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isNavigationOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const sidebar = sidebarRef.current;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebar
      ?.querySelector<HTMLElement>("button:not([disabled]), a[href]")
      ?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsNavigationOpen(false);
        return;
      }
      if (event.key !== "Tab" || !sidebar) return;

      const focusable = Array.from(
        sidebar.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])",
        ),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previouslyFocused?.focus();
    };
  }, [isNavigationOpen]);

  return (
    <div className="dashboard-layout">
      <Sidebar
        isOpen={isNavigationOpen}
        navigation={navigation}
        onNavigate={() => setIsNavigationOpen(false)}
        ref={sidebarRef}
      />
      <MobileNavigation
        isOpen={isNavigationOpen}
        onClose={() => setIsNavigationOpen(false)}
      />
      <div className="dashboard-column">
        <Header
          actions={headerActions}
          menuExpanded={isNavigationOpen}
          onMenuToggle={() => setIsNavigationOpen((open) => !open)}
          title={headerTitle}
        />
        <main className="dashboard-content" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
