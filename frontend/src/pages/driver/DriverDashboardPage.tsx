import { DashboardList } from "../../components/common/DashboardList";
import { DashboardMetric } from "../../components/common/DashboardMetric";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAuth } from "../../hooks/useAuth";
import { dashboardService } from "../../services/dashboardService";
import { formatDate, formatNumber } from "../../utils/formatDate";
import { getStatusTone } from "../../utils/statusTone";

export default function DriverDashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  const dashboard = dashboardService.getDriverDashboard(user);
  const vehicle = dashboard.assignedVehicle;

  return (
    <div className="role-dashboard-page">
      <PageHeader
        breadcrumbs={[{ label: "Driver" }, { label: "Dashboard" }]}
        eyebrow="Assigned vehicle"
        subtitle="Vehicle, mileage, service, and notification records resolved from the active driver profile."
        title="Driver dashboard"
      />

      <section aria-label="Driver summaries" className="dashboard-metrics-grid">
        <DashboardMetric
          detail={vehicle?.model ?? "No active assignment"}
          label="Assigned vehicle"
          value={vehicle?.plate ?? "None"}
        />
        <DashboardMetric
          detail="Recorded odometer"
          label="Mileage summary"
          value={vehicle ? `${formatNumber(vehicle.mileage)} km` : "—"}
        />
        <DashboardMetric
          label="Maintenance reminders"
          value={dashboard.maintenanceReminders.length}
        />
        <DashboardMetric
          label="Notifications"
          value={dashboard.notifications.length}
        />
      </section>

      <div className="dashboard-sections-grid">
        <Card eyebrow="Vehicle status" title="Assigned vehicle">
          {vehicle ? (
            <div className="vehicle-summary">
              <div>
                <strong>{vehicle.plate}</strong>
                <span>{vehicle.model}</span>
              </div>
              <StatusBadge tone={getStatusTone(vehicle.status)}>
                {vehicle.status}
              </StatusBadge>
              <dl>
                <div>
                  <dt>Type</dt>
                  <dd>{vehicle.type}</dd>
                </div>
                <div>
                  <dt>Model year</dt>
                  <dd>{vehicle.year}</dd>
                </div>
                <div>
                  <dt>Health record</dt>
                  <dd>{vehicle.health}%</dd>
                </div>
              </dl>
            </div>
          ) : (
            <EmptyState
              description="A vehicle will appear when an active assignment is linked to this driver profile."
              title="No assigned vehicle"
            />
          )}
        </Card>
        <DashboardList
          emptyDescription="Scheduled service for the assigned vehicle will appear here."
          emptyTitle="No maintenance reminders"
          eyebrow="Service schedule"
          items={dashboard.maintenanceReminders.map((schedule) => ({
            description: `${schedule.vehicle.plate} · due ${formatDate(schedule.dueDate)}`,
            id: schedule.id,
            status: schedule.status,
            title: schedule.service,
            tone: getStatusTone(schedule.status),
          }))}
          title="Maintenance reminders"
        />
        <DashboardList
          emptyDescription="Mileage submitted by this driver will appear here."
          emptyTitle="No mileage submissions"
          eyebrow="Mileage history"
          items={dashboard.recentSubmissions.map((submission) => ({
            description: `${submission.vehicle.plate} · ${submission.notes}`,
            id: submission.id,
            meta: formatDate(submission.submittedAt),
            status: `${formatNumber(submission.mileage)} km`,
            title: "Odometer submission",
          }))}
          title="Recent submissions"
        />
        <DashboardList
          emptyDescription="Account-specific driver notifications will appear here."
          emptyTitle="No notifications"
          eyebrow="Account updates"
          items={dashboard.notifications.map((notification) => ({
            description: notification.message,
            id: notification.id,
            meta: formatDate(notification.createdAt),
            status: notification.read ? "Read" : "Unread",
            title: notification.title,
            tone: notification.read ? "neutral" : "info",
          }))}
          title="Notifications"
        />
      </div>
    </div>
  );
}
