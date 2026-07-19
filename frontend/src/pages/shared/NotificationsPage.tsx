import { Link } from "react-router-dom";

import { ErrorState } from "../../components/common/ErrorState";
import { EmptyState } from "../../components/common/EmptyState";
import { ManagementLoadingState } from "../../components/common/ManagementLoadingState";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { StatusBadge, type StatusTone } from "../../components/ui/StatusBadge";
import { useAuth } from "../../hooks/useAuth";
import { useFleetData } from "../../hooks/useFleetData";
import { fleetDataService } from "../../services/fleetDataService";
import { sharedViewService } from "../../services/sharedViewService";
import type { Notification } from "../../types/fleet";

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getNotificationTone(notification: Notification): StatusTone {
  if (notification.type === "Reminder") return "warning";
  if (notification.type === "Maintenance") return "info";
  if (notification.type === "Assignment") return "success";
  return "neutral";
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useFleetData();

  if (isLoading)
    return <ManagementLoadingState label="Loading notifications" />;
  if (error)
    return (
      <ErrorState
        description={error}
        onRetry={reload}
        title="Notifications could not be loaded"
      />
    );
  if (!data || !user) return null;

  const notifications = sharedViewService.getNotifications(data, user);
  const unreadCount = notifications.filter(
    (notification) => !notification.readAt,
  ).length;

  return (
    <div className="role-dashboard-page">
      <PageHeader
        actions={
          <Button
            disabled={unreadCount === 0}
            onClick={() => fleetDataService.markAllNotificationsRead(user.id)}
            size="small"
          >
            Mark all as read
          </Button>
        }
        breadcrumbs={[{ label: "Workspace" }, { label: "Notifications" }]}
        eyebrow="Account activity"
        subtitle={`${unreadCount} unread notification${unreadCount === 1 ? "" : "s"} for this signed-in account.`}
        title="Notifications"
      />
      <Card className="notification-center-card">
        {notifications.length === 0 ? (
          <EmptyState
            description="Assignment, maintenance, mileage, and system updates relevant to this account will appear here."
            title="No notifications"
          />
        ) : (
          <div className="notification-center-list">
            {notifications.map((notification) => (
              <article
                className={
                  notification.readAt
                    ? "notification-row"
                    : "notification-row notification-row-unread"
                }
                key={notification.id}
              >
                <span
                  aria-label={notification.readAt ? "Read" : "Unread"}
                  className={notification.readAt ? "read-dot" : "unread-dot"}
                />
                <div className="notification-row-content">
                  <div className="notification-row-heading">
                    <div>
                      <strong>{notification.title}</strong>
                      <span>
                        {formatNotificationDate(notification.createdAt)}
                      </span>
                    </div>
                    <StatusBadge tone={getNotificationTone(notification)}>
                      {notification.type}
                    </StatusBadge>
                  </div>
                  <p>{notification.message}</p>
                  <div className="notification-row-actions">
                    <Link className="text-link" to={notification.relatedRoute}>
                      Open related page
                    </Link>
                    {!notification.readAt && (
                      <Button
                        onClick={() =>
                          fleetDataService.markNotificationRead(
                            notification.id,
                            user.id,
                          )
                        }
                        size="small"
                        variant="ghost"
                      >
                        Mark as read
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
