import { DashboardList } from "../../components/common/DashboardList";
import { DashboardMetric } from "../../components/common/DashboardMetric";
import { ErrorState } from "../../components/common/ErrorState";
import { ManagementLoadingState } from "../../components/common/ManagementLoadingState";
import { PageHeader } from "../../components/layout/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import { useFleetData } from "../../hooks/useFleetData";
import { dashboardService } from "../../services/dashboardService";
import { formatDate, formatNumber } from "../../utils/formatDate";
import { formatStatus } from "../../utils/formatStatus";
import { getStatusTone } from "../../utils/statusTone";

export default function MechanicDashboardPage() {
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useFleetData();

  if (!user) return null;
  if (isLoading) {
    return <ManagementLoadingState label="Loading mechanic dashboard" />;
  }
  if (error || !data) {
    return (
      <ErrorState
        description={error || "The fleet records are unavailable."}
        onRetry={() => void reload()}
        title="Mechanic dashboard unavailable"
      />
    );
  }

  const dashboard = dashboardService.getMechanicDashboard(data, user);

  return (
    <div className="role-dashboard-page">
      <PageHeader
        breadcrumbs={[{ label: "Mechanic" }, { label: "Dashboard" }]}
        eyebrow="Service workspace"
        subtitle="Calculated from work, history, and notifications linked to the active session's mechanic profile in the demonstration records."
        title="Mechanic dashboard"
      />

      <section
        aria-label="Mechanic summaries"
        className="dashboard-metrics-grid"
      >
        <DashboardMetric
          detail={
            dashboard.mechanicProfile?.specialization ?? "No linked profile"
          }
          label="Assigned work orders"
          value={dashboard.assignedWork.length}
        />
        <DashboardMetric label="Scheduled" value={dashboard.scheduled} />
        <DashboardMetric label="In progress" value={dashboard.inProgress} />
        <DashboardMetric
          detail="Most recent linked history records"
          label="Completed recently"
          value={dashboard.completedRecently.length}
        />
      </section>

      <div className="dashboard-sections-grid">
        <DashboardList
          emptyDescription="Open work assigned to this mechanic will appear here."
          emptyTitle="No open assigned work"
          eyebrow="Work queue"
          items={dashboard.openAssignedWork.map((record) => ({
            description: `${record.vehicle.plateNumber} · ${record.vehicle.make} ${record.vehicle.model} · scheduled ${formatDate(record.scheduledDate)} · ${record.mileageStatus ? `${formatStatus(record.mileageStatus.status)} (${record.mileageStatus.remainingDistance === null ? "no service history" : `${formatNumber(record.mileageStatus.remainingDistance)} km remaining`})` : "mileage status unavailable"}`,
            id: record.id,
            status: formatStatus(record.status),
            title: record.service,
            tone: getStatusTone(record.status),
          }))}
          title="Assigned work orders"
        />
        <DashboardList
          emptyDescription="Completed work linked to this mechanic will appear here."
          emptyTitle="No completed service history"
          eyebrow="Completed work"
          items={dashboard.completedRecently.map((record) => ({
            description: `${record.vehicle.plateNumber} · ${record.vehicle.make} ${record.vehicle.model} · ${formatNumber(record.odometerAtService)} km`,
            id: record.id,
            meta: formatDate(record.serviceDate),
            status: "Completed",
            title: record.service,
            tone: "success",
          }))}
          title="Completed recently"
        />
        <DashboardList
          className="dashboard-section-wide"
          emptyDescription="Notifications addressed to this mechanic will appear here."
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
