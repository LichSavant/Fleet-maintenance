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

const COST_FORMATTER = new Intl.NumberFormat(undefined, {
  currency: "PHP",
  style: "currency",
});

export default function ManagerDashboardPage() {
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useFleetData();

  if (!user) return null;
  if (isLoading) {
    return <ManagementLoadingState label="Loading manager dashboard" />;
  }
  if (error || !data) {
    return (
      <ErrorState
        description={error || "The fleet records are unavailable."}
        onRetry={() => void reload()}
        title="Manager dashboard unavailable"
      />
    );
  }

  const dashboard = dashboardService.getManagerDashboard(data, user.id);

  return (
    <div className="role-dashboard-page">
      <PageHeader
        breadcrumbs={[{ label: "Manager" }, { label: "Dashboard" }]}
        eyebrow="Fleet operations"
        subtitle="Calculated from the current browser-persisted demonstration records; this is not live server data."
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
          label="Active assignments"
          value={dashboard.activeAssignments.length}
        />
        <DashboardMetric
          label="Unassigned vehicles"
          value={dashboard.unassignedVehicles}
        />
        <DashboardMetric
          label="Due-soon services"
          value={dashboard.dueSoonServices.length}
        />
        <DashboardMetric
          label="Overdue services"
          value={dashboard.overdueServices.length}
        />
        <DashboardMetric
          label="Open work orders"
          value={dashboard.openWorkOrders.length}
        />
        <DashboardMetric
          detail="Recorded completed-service cost"
          label="Maintenance cost"
          value={COST_FORMATTER.format(dashboard.totalMaintenanceCost)}
        />
      </section>

      <div className="dashboard-sections-grid">
        <DashboardList
          emptyDescription="Active driver and vehicle pairings will appear here."
          emptyTitle="No active assignments"
          eyebrow="Assignments"
          items={dashboard.activeAssignments.slice(0, 6).map((assignment) => ({
            description: `${assignment.driverName} · assigned ${formatDate(assignment.startDate)}`,
            id: assignment.id,
            status: assignment.vehicle.status,
            title: `${assignment.vehicle.plateNumber} · ${assignment.vehicle.model}`,
            tone: getStatusTone(assignment.vehicle.status),
          }))}
          title="Active assignments"
        />
        <DashboardList
          emptyDescription="Open work orders will appear here."
          emptyTitle="No open work orders"
          eyebrow="Maintenance workflow"
          items={dashboard.openWorkOrders.slice(0, 6).map((workOrder) => ({
            description: `${workOrder.vehicle.plateNumber} · scheduled ${formatDate(workOrder.scheduledDate)}`,
            id: workOrder.id,
            status: formatStatus(workOrder.status),
            title: workOrder.service,
            tone: getStatusTone(workOrder.status),
          }))}
          title="Open work orders"
        />
        <DashboardList
          emptyDescription="Due service exceptions will appear here."
          emptyTitle="No mileage-based service exceptions"
          eyebrow="Mileage-based maintenance"
          items={[...dashboard.overdueServices, ...dashboard.dueSoonServices]
            .slice(0, 6)
            .map((item) => ({
              description: `${item.vehicle.plateNumber} · ${formatNumber(item.currentMileage)} km current · ${formatNumber(item.nextServiceMileage ?? 0)} km next · ${formatNumber(item.remainingDistance ?? 0)} km remaining`,
              id: `${item.vehicleId}-${item.serviceTypeId}`,
              status: formatStatus(item.status),
              title: item.service,
              tone: getStatusTone(item.status),
            }))}
          title="Due-soon and overdue services"
        />
        <DashboardList
          emptyDescription="Audit events for fleet operations will appear here."
          emptyTitle="No operational events"
          eyebrow="Audit trail"
          items={dashboard.recentOperationalEvents.map((event) => ({
            description: `${event.actorName} · ${event.description}`,
            id: event.id,
            meta: formatDate(event.createdAt),
            title: event.action,
          }))}
          title="Recent operational events"
        />
      </div>
    </div>
  );
}
