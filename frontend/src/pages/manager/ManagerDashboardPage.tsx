import { ErrorState } from "../../components/common/ErrorState";
import { ManagementLoadingState } from "../../components/common/ManagementLoadingState";
import {
  DonutChart,
  EmptyDashboardState,
  MiniBars,
  PanelLink,
  PremiumGreeting,
  PremiumMetric,
  PremiumPage,
  PremiumPanel,
  Sparkline,
  StatusPill,
} from "../../components/dashboard/PremiumDashboard";
import { useAuth } from "../../hooks/useAuth";
import { useFleetData } from "../../hooks/useFleetData";
import { formatDate, formatNumber } from "../../utils/formatDate";
import { formatStatus } from "../../utils/formatStatus";

export default function ManagerDashboardPage() {
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useFleetData();
  if (isLoading)
    return <ManagementLoadingState label="Loading manager dashboard" />;
  if (error || !data)
    return (
      <ErrorState
        title="Dashboard could not be loaded"
        description={error || "No fleet data is available."}
        onRetry={reload}
      />
    );

  const activeAssignments = data.assignments.filter(
    (item) => item.status === "Active",
  );
  const availableVehicles = data.vehicles.filter(
    (item) => item.status === "Active",
  ).length;
  const openWork = data.maintenanceRecords.filter(
    (item) => !["completed", "cancelled"].includes(item.status),
  );
  const today = new Date().toISOString().slice(0, 10);
  const todaySchedules = [...data.maintenanceSchedules]
    .filter(
      (item) =>
        item.dueDate >= today &&
        !["Cancelled", "Converted"].includes(item.status),
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);
  const recentWork = [...data.maintenanceRecords]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
  const workCounts = {
    scheduled: data.maintenanceRecords.filter(
      (item) => item.status === "scheduled",
    ).length,
    assigned: data.maintenanceRecords.filter(
      (item) => item.status === "assigned",
    ).length,
    inProgress: data.maintenanceRecords.filter(
      (item) => item.status === "in_progress",
    ).length,
    completed: data.maintenanceRecords.filter(
      (item) => item.status === "completed",
    ).length,
  };
  const utilization = Math.round(
    (activeAssignments.length / Math.max(data.vehicles.length, 1)) * 100,
  );
  const mileageTrend = [...data.mileageSubmissions]
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
    .slice(-8)
    .map((item) => item.mileage);
  const managerProfile = data.managerProfiles.find(
    (item) => item.userId === user?.id,
  );

  return (
    <PremiumPage>
      <PremiumGreeting
        eyebrow={managerProfile?.depot ?? "Manager dashboard"}
        title={`Welcome back, ${user?.fullName.split(" ")[0] ?? "Manager"}`}
        subtitle="A focused view of assignments, maintenance capacity, and fleet readiness."
      />
      <div className="premium-metric-grid premium-metric-grid-four">
        <PremiumMetric
          icon="driver"
          label="Total drivers"
          value={data.driverProfiles.length}
          detail={`${data.driverProfiles.filter((item) => item.status === "Available").length} available`}
        />
        <PremiumMetric
          icon="wrench"
          tone="green"
          label="Total mechanics"
          value={data.mechanicProfiles.length}
          detail={`${data.mechanicProfiles.filter((item) => item.status === "Active").length} active`}
        />
        <PremiumMetric
          icon="truck"
          tone="amber"
          label="Vehicles available"
          value={availableVehicles}
          detail={`${data.vehicles.length} total vehicles`}
        />
        <PremiumMetric
          icon="check"
          tone="violet"
          label="Active assignments"
          value={activeAssignments.length}
          detail={`${utilization}% fleet utilization`}
        />
      </div>

      <div className="premium-dashboard-grid premium-dashboard-grid-manager">
        <PremiumPanel
          title="Assignments"
          subtitle="Current fleet deployment"
          action={<PanelLink to="/operations/assignments">View all</PanelLink>}
        >
          <div className="premium-stat-list">
            <div>
              <span>Active</span>
              <strong>{activeAssignments.length}</strong>
            </div>
            <div>
              <span>Available drivers</span>
              <strong>
                {
                  data.driverProfiles.filter(
                    (item) => item.status === "Available",
                  ).length
                }
              </strong>
            </div>
            <div>
              <span>Available vehicles</span>
              <strong>
                {Math.max(availableVehicles - activeAssignments.length, 0)}
              </strong>
            </div>
            <div>
              <span>Ended records</span>
              <strong>
                {
                  data.assignments.filter((item) => item.status === "Ended")
                    .length
                }
              </strong>
            </div>
          </div>
        </PremiumPanel>

        <PremiumPanel
          title="Schedule"
          subtitle="Next maintenance commitments"
          action={<PanelLink to="/maintenance/schedules">Calendar</PanelLink>}
        >
          {todaySchedules.length ? (
            <div className="premium-list premium-list-compact">
              {todaySchedules.map((schedule) => {
                const vehicle = data.vehicles.find(
                  (item) => item.id === schedule.vehicleId,
                );
                const service = data.serviceTypes.find(
                  (item) => item.id === schedule.serviceTypeId,
                );
                return (
                  <article key={schedule.id}>
                    <div>
                      <strong>{service?.name ?? "Maintenance"}</strong>
                      <span>
                        {formatDate(schedule.dueDate)} ·{" "}
                        {vehicle?.fleetNumber ?? "Vehicle"}
                      </span>
                    </div>
                    <StatusPill tone="warning">Upcoming</StatusPill>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyDashboardState message="No upcoming maintenance schedules." />
          )}
        </PremiumPanel>

        <PremiumPanel title="Work order status" subtitle="Maintenance pipeline">
          <DonutChart
            centerLabel="Total"
            centerValue={data.maintenanceRecords.length}
            segments={[
              { label: "Scheduled", tone: "gray", value: workCounts.scheduled },
              { label: "Assigned", tone: "amber", value: workCounts.assigned },
              {
                label: "In progress",
                tone: "blue",
                value: workCounts.inProgress,
              },
              {
                label: "Completed",
                tone: "green",
                value: workCounts.completed,
              },
            ]}
          />
        </PremiumPanel>

        <PremiumPanel
          title="Fleet utilization"
          subtitle="Active assignments over total vehicles"
        >
          <div className="premium-kpi-large">
            <strong>{utilization}%</strong>
            <span>
              {activeAssignments.length} of {data.vehicles.length} vehicles
              assigned
            </span>
          </div>
          <Sparkline
            values={
              mileageTrend.length
                ? mileageTrend
                : [0, activeAssignments.length, availableVehicles]
            }
          />
        </PremiumPanel>

        <PremiumPanel
          title="Maintenance workload"
          subtitle="Open work by stage"
        >
          <MiniBars
            values={[
              workCounts.scheduled,
              workCounts.assigned,
              workCounts.inProgress,
              workCounts.completed,
            ]}
          />
          <div className="premium-chart-labels">
            <span>Scheduled</span>
            <span>Assigned</span>
            <span>In progress</span>
            <span>Completed</span>
          </div>
          <div className="premium-inline-summary">
            <div>
              <span>Open work</span>
              <strong>{openWork.length}</strong>
            </div>
            <div>
              <span>Completed</span>
              <strong>{workCounts.completed}</strong>
            </div>
          </div>
        </PremiumPanel>

        <PremiumPanel
          title="Recent work orders"
          subtitle="Latest maintenance requests"
          action={<PanelLink to="/maintenance/work-orders">View all</PanelLink>}
        >
          {recentWork.length ? (
            <div className="premium-list premium-list-compact">
              {recentWork.map((work) => {
                const vehicle = data.vehicles.find(
                  (item) => item.id === work.vehicleId,
                );
                const service = data.serviceTypes.find(
                  (item) => item.id === work.serviceTypeId,
                );
                return (
                  <article key={work.id}>
                    <div>
                      <strong>{service?.name ?? "Work order"}</strong>
                      <span>
                        {vehicle?.fleetNumber ?? "Vehicle"} ·{" "}
                        {formatDate(work.scheduledDate)}
                      </span>
                    </div>
                    <StatusPill
                      tone={
                        work.status === "completed"
                          ? "success"
                          : work.status === "in_progress"
                            ? "info"
                            : "warning"
                      }
                    >
                      {formatStatus(work.status)}
                    </StatusPill>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyDashboardState message="No work orders are available." />
          )}
        </PremiumPanel>

        <PremiumPanel
          title="Operational summary"
          subtitle="Current fleet totals"
          className="premium-panel-wide"
        >
          <div className="premium-summary-strip">
            <div>
              <span>Total vehicles</span>
              <strong>{formatNumber(data.vehicles.length)}</strong>
            </div>
            <div>
              <span>Active service types</span>
              <strong>
                {data.serviceTypes.filter((item) => item.active).length}
              </strong>
            </div>
            <div>
              <span>Mileage submissions</span>
              <strong>{data.mileageSubmissions.length}</strong>
            </div>
            <div>
              <span>Completed service</span>
              <strong>{workCounts.completed}</strong>
            </div>
          </div>
        </PremiumPanel>
      </div>
    </PremiumPage>
  );
}
