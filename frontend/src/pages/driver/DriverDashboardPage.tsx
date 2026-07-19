import { DashboardList } from "../../components/common/DashboardList";
import { DashboardMetric } from "../../components/common/DashboardMetric";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { ManagementLoadingState } from "../../components/common/ManagementLoadingState";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAuth } from "../../hooks/useAuth";
import { useFleetData } from "../../hooks/useFleetData";
import { dashboardService } from "../../services/dashboardService";
import { formatDate, formatNumber } from "../../utils/formatDate";
import { formatStatus } from "../../utils/formatStatus";
import { getStatusTone } from "../../utils/statusTone";

export default function DriverDashboardPage() {
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useFleetData();

  if (!user) return null;
  if (isLoading) {
    return <ManagementLoadingState label="Loading driver dashboard" />;
  }
  if (error || !data) {
    return (
      <ErrorState
        description={error || "The fleet records are unavailable."}
        onRetry={() => void reload()}
        title="Driver dashboard unavailable"
      />
    );
  }

  const dashboard = dashboardService.getDriverDashboard(data, user);
  const vehicle = dashboard.assignedVehicle;

  return (
    <div className="role-dashboard-page">
      <PageHeader
        breadcrumbs={[{ label: "Driver" }, { label: "Dashboard" }]}
        eyebrow="Assigned vehicle"
        subtitle="Calculated from demonstration records linked to the active session's driver profile; this is not live server data."
        title="Driver dashboard"
      />

      <section aria-label="Driver summaries" className="dashboard-metrics-grid">
        <DashboardMetric
          detail={
            vehicle
              ? `${vehicle.make} ${vehicle.model}`
              : "No active assignment"
          }
          label="Assigned vehicle"
          value={vehicle?.plateNumber ?? "None"}
        />
        <DashboardMetric
          detail="Current vehicle odometer"
          label="Current mileage"
          value={vehicle ? `${formatNumber(vehicle.currentMileage)} km` : "—"}
        />
        <DashboardMetric
          detail={
            dashboard.latestMileageEntry
              ? formatDate(dashboard.latestMileageEntry.logDate)
              : "No mileage entry"
          }
          label="Latest mileage entry"
          value={
            dashboard.latestMileageEntry
              ? `${formatNumber(dashboard.latestMileageEntry.odometerReading)} km`
              : "—"
          }
        />
        <DashboardMetric
          label="Due-soon services"
          value={dashboard.dueSoonServices}
        />
        <DashboardMetric
          label="Overdue services"
          value={dashboard.overdueServices}
        />
      </section>

      <div className="dashboard-sections-grid">
        <Card eyebrow="Vehicle status" title="Active assigned vehicle">
          {vehicle ? (
            <div className="vehicle-summary">
              <div>
                <strong>{vehicle.plateNumber}</strong>
                <span>{`${vehicle.make} ${vehicle.model}`}</span>
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
              title="No active vehicle assignment"
            />
          )}
        </Card>
        <DashboardList
          emptyDescription="Active service types for the assigned vehicle will appear here."
          emptyTitle="No required-service calculations"
          eyebrow="Mileage-based maintenance"
          items={dashboard.nextRequiredServices.map((service) => ({
            description:
              service.status === "NO_HISTORY"
                ? `${formatNumber(service.currentMileage)} km current · ${formatNumber(service.recommendedIntervalKm)} km interval · no completed-service history`
                : `${formatNumber(service.currentMileage)} km current · ${formatNumber(service.lastCompletedServiceMileage ?? 0)} km last · ${formatNumber(service.recommendedIntervalKm)} km interval · ${formatNumber(service.nextServiceMileage ?? 0)} km next · ${formatNumber(service.remainingDistance ?? 0)} km remaining`,
            id: `${service.vehicleId}-${service.serviceTypeId}`,
            status: formatStatus(service.status),
            title: service.service,
            tone: getStatusTone(service.status),
          }))}
          title="Next required services"
        />
        <DashboardList
          emptyDescription="Completed service for the assigned vehicle will appear here."
          emptyTitle="No recent service history"
          eyebrow="Maintenance history"
          items={dashboard.recentServiceHistory.map((record) => ({
            description: `${formatNumber(record.odometerAtService)} km · ${record.notes}`,
            id: record.id,
            meta: formatDate(record.serviceDate),
            status: "Completed",
            title: record.service,
            tone: "success",
          }))}
          title="Recent service history"
        />
        <DashboardList
          emptyDescription="Mileage submitted by this driver will appear here."
          emptyTitle="No mileage submissions"
          eyebrow="Mileage history"
          items={dashboard.recentSubmissions.map((submission) => ({
            description: `${submission.vehicle.plateNumber} · ${submission.notes || "No notes"}`,
            id: submission.id,
            meta: formatDate(submission.logDate),
            status: `${formatNumber(submission.odometerReading)} km`,
            title: "Odometer submission",
          }))}
          title="Recent mileage submissions"
        />
        <DashboardList
          emptyDescription="Notifications addressed to this driver will appear here."
          emptyTitle="No relevant notifications"
          eyebrow="Account updates"
          items={dashboard.notifications.map((notification) => ({
            description: notification.message,
            id: notification.id,
            meta: formatDate(notification.createdAt),
            status: notification.readAt ? "Read" : "Unread",
            title: notification.title,
            tone: notification.readAt ? "neutral" : "info",
          }))}
          title="Relevant notifications"
        />
      </div>
    </div>
  );
}
