import { DashboardList } from "../../components/common/DashboardList";
import { DashboardMetric } from "../../components/common/DashboardMetric";
import { PageHeader } from "../../components/layout/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import { dashboardService } from "../../services/dashboardService";
import { formatDate } from "../../utils/formatDate";
import { formatStatus } from "../../utils/formatStatus";
import { getStatusTone } from "../../utils/statusTone";

export default function MechanicDashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  const dashboard = dashboardService.getMechanicDashboard(user);

  return (
    <div className="role-dashboard-page">
      <PageHeader
        breadcrumbs={[{ label: "Mechanic" }, { label: "Dashboard" }]}
        eyebrow="Service workspace"
        subtitle="Only work linked to the mechanic profile for the active session is included."
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
          label="Assigned work"
          value={dashboard.assignedWork.length}
        />
        <DashboardMetric label="Pending jobs" value={dashboard.pendingJobs} />
        <DashboardMetric
          label="Work in progress"
          value={dashboard.inProgress}
        />
        <DashboardMetric
          label="Completed service"
          value={dashboard.completedService}
        />
      </section>

      <div className="dashboard-sections-grid">
        <DashboardList
          emptyDescription="Work assigned to this mechanic will appear here."
          emptyTitle="No assigned work"
          eyebrow="Work queue"
          items={dashboard.assignedWork.map((record) => ({
            description: `${record.vehicle.plateNumber} · scheduled ${formatDate(record.scheduledDate)}`,
            id: record.id,
            status: formatStatus(record.status),
            title: record.service,
            tone: getStatusTone(record.status),
          }))}
          title="Assigned work"
        />
        <DashboardList
          emptyDescription="Completed work for this mechanic will appear here."
          emptyTitle="No service history"
          eyebrow="Completed work"
          items={dashboard.recentServiceHistory.map((record) => ({
            description: `${record.vehicle.plateNumber} · ${record.vehicle.model}`,
            id: record.id,
            meta: formatDate(record.serviceDate),
            status: "Completed",
            title: record.service,
            tone: "success",
          }))}
          title="Recent service history"
        />
        <DashboardList
          className="dashboard-section-wide"
          emptyDescription="Account-specific service notifications will appear here."
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
