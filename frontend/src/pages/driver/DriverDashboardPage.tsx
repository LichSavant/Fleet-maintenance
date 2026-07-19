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
          value={vehicle?.plateNumber ?? "None"}
        />
        <DashboardMetric
          detail="Recorded odometer"
          label="Mileage summary"
          value={vehicle ? `${formatNumber(vehicle.currentMileage)} km` : "—"}
        />
        <DashboardMetric
          label="Service calculations"
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
                <strong>{vehicle.plateNumber}</strong>
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
                  <dt>VIN</dt>
                  <dd>{vehicle.vin}</dd>
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
          emptyDescription="Active service types for the assigned vehicle will appear here."
          emptyTitle="No service calculations"
          eyebrow="Mileage-based maintenance"
          items={dashboard.maintenanceReminders.map((reminder) => ({
            description:
              reminder.status === "NO_HISTORY"
                ? `${formatNumber(reminder.currentMileage)} km current · no completed-service history`
                : `${formatNumber(reminder.currentMileage)} km current · ${formatNumber(reminder.lastCompletedServiceMileage ?? 0)} km last · ${formatNumber(reminder.recommendedIntervalKm)} km interval · ${formatNumber(reminder.nextServiceMileage ?? 0)} km next · ${formatNumber(reminder.remainingDistance ?? 0)} km remaining`,
            id: `${reminder.vehicleId}-${reminder.serviceTypeId}`,
            status: reminder.status.replace("_", " "),
            title: reminder.service,
            tone: getStatusTone(reminder.status),
          }))}
          title="Service mileage status"
        />
        <DashboardList
          emptyDescription="Mileage submitted by this driver will appear here."
          emptyTitle="No mileage submissions"
          eyebrow="Mileage history"
          items={dashboard.recentSubmissions.map((submission) => ({
            description: `${submission.vehicle.plateNumber} · ${submission.notes}`,
            id: submission.id,
            meta: formatDate(submission.logDate),
            status: `${formatNumber(submission.odometerReading)} km`,
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
            status: notification.readAt ? "Read" : "Unread",
            title: notification.title,
            tone: notification.readAt ? "neutral" : "info",
          }))}
          title="Notifications"
        />
      </div>
    </div>
  );
}
