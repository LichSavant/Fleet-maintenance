import { DashboardList } from "../../components/common/DashboardList";
import { DashboardMetric } from "../../components/common/DashboardMetric";
import { PageHeader } from "../../components/layout/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import { dashboardService } from "../../services/dashboardService";
import { formatDate, formatNumber } from "../../utils/formatDate";
import { formatStatus } from "../../utils/formatStatus";
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
          detail="Due soon, due now, or overdue"
          label="Mileage service attention"
          value={
            dashboard.serviceMileageStatuses.filter((item) =>
              ["DUE_SOON", "DUE_NOW", "OVERDUE"].includes(item.status),
            ).length
          }
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
          emptyDescription="Due service or missing completed-service history will appear here."
          emptyTitle="No service attention required"
          eyebrow="Mileage-based maintenance"
          items={dashboard.serviceMileageStatuses
            .filter((item) => item.status !== "UPCOMING")
            .slice(0, 8)
            .map((item) => ({
              description:
                item.status === "NO_HISTORY"
                  ? `${item.vehicle.plateNumber} · ${formatNumber(item.currentMileage)} km current · no completed-service history`
                  : `${item.vehicle.plateNumber} · ${formatNumber(item.currentMileage)} km current · ${formatNumber(item.lastCompletedServiceMileage ?? 0)} km last · ${formatNumber(item.recommendedIntervalKm)} km interval · ${formatNumber(item.nextServiceMileage ?? 0)} km next · ${formatNumber(item.remainingDistance ?? 0)} km remaining`,
              id: `${item.vehicleId}-${item.serviceTypeId}`,
              status: formatStatus(item.status),
              title: item.service,
              tone: getStatusTone(item.status),
            }))}
          title="Service attention and history gaps"
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
            status: alert.tone === "danger" ? "Overdue" : "Due now",
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
            description: `${schedule.vehicle.plateNumber} · planned ${formatDate(schedule.dueDate)}`,
            id: schedule.id,
            meta: `Created ${formatDate(schedule.createdAt)}`,
            status: schedule.status,
            title: schedule.service,
            tone: getStatusTone(schedule.status),
          }))}
          title="Recent manual plans"
        />
      </div>
    </div>
  );
}
