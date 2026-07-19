import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import { sharedViewService } from "../../services/sharedViewService";
import type { Notification } from "../../types/fleet";
import { formatRole } from "../../utils/roleRoutes";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

export interface AuthenticatedHeaderActionsProps {
  notifications: readonly Notification[];
}

type OpenPanel = "notifications" | "profile" | null;

function getInitials(fullName: string) {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function AuthenticatedHeaderActions({
  notifications,
}: AuthenticatedHeaderActionsProps) {
  const { signOut, user } = useAuth();
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const unreadCount =
    sharedViewService.getUnreadNotificationCount(notifications);

  useEffect(() => {
    if (!openPanel) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenPanel(null);
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) {
        setOpenPanel(null);
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [openPanel]);

  if (!user) return null;

  return (
    <div className="header-tools" ref={actionsRef}>
      <div className="header-popover-anchor">
        <button
          aria-controls="header-notifications-panel"
          aria-expanded={openPanel === "notifications"}
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
          className="icon-button notification-button"
          onClick={() =>
            setOpenPanel((current) =>
              current === "notifications" ? null : "notifications",
            )
          }
          type="button"
        >
          <Icon name="bell" />
          {unreadCount > 0 && (
            <span className="notification-count">{unreadCount}</span>
          )}
        </button>
        {openPanel === "notifications" && (
          <section
            aria-label="Notifications"
            className="header-popover notifications-popover"
            id="header-notifications-panel"
          >
            <header>
              <strong>Notifications</strong>
              <span>{unreadCount} unread</span>
            </header>
            {notifications.length === 0 ? (
              <p className="popover-empty">
                No notifications for this account.
              </p>
            ) : (
              <div className="header-notification-list">
                {notifications.slice(0, 4).map((notification) => (
                  <article key={notification.id}>
                    <span
                      aria-label={notification.readAt ? "Read" : "Unread"}
                      className={
                        notification.readAt ? "read-dot" : "unread-dot"
                      }
                    />
                    <div>
                      <Link
                        className="header-notification-link"
                        onClick={() => setOpenPanel(null)}
                        to={notification.relatedRoute}
                      >
                        <strong>{notification.title}</strong>
                      </Link>
                      <p>{notification.message}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <Link
              className="header-popover-footer"
              onClick={() => setOpenPanel(null)}
              to="/notifications"
            >
              View all notifications
            </Link>
          </section>
        )}
      </div>

      <div className="header-popover-anchor">
        <button
          aria-controls="header-profile-panel"
          aria-expanded={openPanel === "profile"}
          aria-label="Open profile menu"
          className="profile-control"
          onClick={() =>
            setOpenPanel((current) =>
              current === "profile" ? null : "profile",
            )
          }
          type="button"
        >
          <span className="profile-initials" aria-hidden="true">
            {getInitials(user.fullName)}
          </span>
          <span className="session-user">
            <strong>{user.fullName}</strong>
            <span>{formatRole(user.role)}</span>
          </span>
          <span className="sr-only">Open profile menu</span>
        </button>
        {openPanel === "profile" && (
          <section
            aria-label="Profile menu"
            className="header-popover profile-popover"
            id="header-profile-panel"
          >
            <div>
              <strong>{user.fullName}</strong>
              <span>{user.email}</span>
              <span>{formatRole(user.role)} account</span>
            </div>
            <Link
              className="button button-secondary button-small button-full-width"
              onClick={() => setOpenPanel(null)}
              to="/profile"
            >
              View profile
            </Link>
            <Button
              fullWidth
              onClick={signOut}
              size="small"
              variant="secondary"
            >
              Sign out
            </Button>
          </section>
        )}
      </div>
    </div>
  );
}
