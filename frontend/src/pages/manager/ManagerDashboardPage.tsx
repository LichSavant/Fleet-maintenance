import { DashboardList } from "../../components/common/DashboardList";
import { DashboardMetric } from "../../components/common/DashboardMetric";
import { PageHeader } from "../../components/layout/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import { dashboardService } from "../../services/dashboardService";
import { formatDate, formatNumber } from "../../utils/formatDate";
import { getStatusTone } from "../../utils/statusTone";

export default function ManagerDashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  const dashboard = dashboardService.getManagerDashboard(user.id);

  return (
    <div className="role-dashboard-page">
      <PageHeader
        breadcrumbs={[{ label: "Manager" }, { label: "Dashboard" }]}
        eyebrow="Fleet operations"
        subtitle="Availability, assignments, maintenance, and schedules calculated from shared fleet records."
        title="Manager dashboard"
      />

      <section
        aria-label="Manager summaries"
        className="dashboard-metrics-grid"
      >
        <DashboardMetric
          detail={`${dashboard.totalVehicles} total vehicles`}
          label="Fleet availability"
          value={dashboard.availableVehicles}
        />
        <DashboardMetric
          label="Current assignments"
          value={dashboard.currentAssignments.length}
        />
        <DashboardMetric
          label="Upcoming maintenance"
          value={dashboard.upcomingMaintenance.length}
        />
        <DashboardMetric
          label="Operational alerts"
          value={dashboard.operationalAlerts.length}
        />
      </section>

      <div className="dashboard-sections-grid">
        <DashboardList
          emptyDescription="Active driver and vehicle pairings will appear here."
          emptyTitle="No current assignments"
          eyebrow="Assignments"
          items={dashboard.currentAssignments.map((assignment) => ({
            description: `${assignment.driverName} · assigned ${formatDate(assignment.startDate)}`,
            id: assignment.id,
            status: assignment.vehicle.status,
            title: `${assignment.vehicle.plateNumber} · ${assignment.vehicle.model}`,
            tone: getStatusTone(assignment.vehicle.status),
          }))}
          title="Current assignments"
        />
        <DashboardList
          emptyDescription="Scheduled fleet service will appear here."
          emptyTitle="No upcoming maintenance"
          eyebrow="Maintenance"
          items={dashboard.upcomingMaintenance.map((schedule) => ({
            description: `${schedule.vehicle.plateNumber} · due ${formatDate(schedule.dueDate)}`,
            id: schedule.id,
            status: schedule.status,
            title: schedule.service,
            tone: getStatusTone(schedule.status),
          }))}
          title="Upcoming maintenance"
        />
        <DashboardList
          emptyDescription="Submitted driver mileage will appear here."
          emptyTitle="No driver activity"
          eyebrow="Driver records"
          items={dashboard.driverActivity.slice(0, 4).map((submission) => ({
            description: `${submission.driverName} · ${submission.vehicle.plateNumber}`,
            id: submission.id,
            meta: formatDate(submission.logDate),
            status: `${formatNumber(submission.odometerReading)} km`,
            title: submission.notes,
          }))}
          title="Driver activity"
        />
        <DashboardList
          emptyDescription="Operational exceptions will appear here."
          emptyTitle="No operational alerts"
          eyebrow="Attention required"
          items={dashboard.operationalAlerts.map((alert) => ({
            description: alert.description,
            id: alert.id,
            status: alert.tone === "danger" ? "Overdue" : "Review",
            title: alert.title,
            tone: alert.tone,
          }))}
          title="Operational alerts"
        />
        <DashboardList
          className="dashboard-section-wide"
          emptyDescription="Newly created schedules will appear here."
          emptyTitle="No recent schedules"
          eyebrow="Planning"
          items={dashboard.recentSchedules.slice(0, 4).map((schedule) => ({
            description: `${schedule.vehicle.plateNumber} · due ${formatDate(schedule.dueDate)}`,
            id: schedule.id,
            meta: `Created ${formatDate(schedule.createdAt)}`,
            status: schedule.status,
            title: schedule.service,
            tone: getStatusTone(schedule.status),
          }))}
          title="Recent schedules"
        />
      </div>
    </div>
  );
}
