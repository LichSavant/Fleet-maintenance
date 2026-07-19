import { DashboardList } from "../../components/common/DashboardList";
import { DashboardMetric } from "../../components/common/DashboardMetric";
import { PageHeader } from "../../components/layout/PageHeader";
import { dashboardService } from "../../services/dashboardService";
import { formatDate } from "../../utils/formatDate";

export default function AdminDashboardPage() {
  const dashboard = dashboardService.getAdminDashboard();

  return (
    <div className="role-dashboard-page">
      <PageHeader
        breadcrumbs={[{ label: "Administrator" }, { label: "Dashboard" }]}
        eyebrow="System oversight"
        subtitle="Calculated fleet, user, and maintenance totals from the shared demonstration dataset."
        title="Administrator dashboard"
      />

      <section
        aria-label="Administrator summaries"
        className="dashboard-metrics-grid"
      >
        <DashboardMetric label="Total users" value={dashboard.totalUsers} />
        <DashboardMetric
          label="Total vehicles"
          value={dashboard.totalVehicles}
        />
        <DashboardMetric
          label="Active vehicles"
          value={dashboard.activeVehicles}
        />
        <DashboardMetric
          label="Maintenance records"
          value={dashboard.maintenanceRecords}
        />
        <DashboardMetric label="Pending work" value={dashboard.pendingWork} />
      </section>

      <DashboardList
        emptyDescription="System activity will appear when fleet records change."
        emptyTitle="No system activity"
        eyebrow="Audit trail"
        items={dashboard.recentActivity.map((activity) => ({
          description: `${activity.actorName} · ${activity.entityLabel}`,
          id: activity.id,
          meta: formatDate(activity.occurredAt),
          title: activity.action,
        }))}
        title="Recent system activity"
      />
    </div>
  );
}
