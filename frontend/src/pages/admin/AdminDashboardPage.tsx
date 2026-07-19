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
import { useFleetData } from "../../hooks/useFleetData";
import { formatDate, formatNumber } from "../../utils/formatDate";
import { formatStatus } from "../../utils/formatStatus";

function workTone(status: string) {
  if (status === "completed") return "success" as const;
  if (status === "in_progress") return "info" as const;
  if (status === "cancelled") return "danger" as const;
  return "warning" as const;
}

export default function AdminDashboardPage() {
  const { data, error, isLoading, reload } = useFleetData();

  if (isLoading)
    return <ManagementLoadingState label="Loading administrator dashboard" />;
  if (error || !data) {
    return (
      <ErrorState
        title="Dashboard could not be loaded"
        description={error || "No fleet data is available."}
        onRetry={reload}
      />
    );
  }

  const activeVehicles = data.vehicles.filter(
    (item) => item.status === "Active",
  ).length;
  const maintenanceVehicles = data.vehicles.filter((item) =>
    ["Maintenance", "Inspection"].includes(item.status),
  ).length;
  const outOfService = data.vehicles.filter(
    (item) => item.status === "Out of Service",
  ).length;
  const activeAssignments = data.assignments.filter(
    (item) => item.status === "Active",
  ).length;
  const openWork = data.maintenanceRecords.filter(
    (item) => !["completed", "cancelled"].includes(item.status),
  );
  const completedWork = data.maintenanceRecords.filter(
    (item) => item.status === "completed",
  ).length;
  const availableDrivers = data.driverProfiles.filter(
    (item) => item.status === "Available",
  ).length;
  const upcomingSchedules = [...data.maintenanceSchedules]
    .filter((item) => !["Converted", "Cancelled"].includes(item.status))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4);
  const recentWork = [...data.maintenanceRecords]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);
  const activity = [...data.systemActivity]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 5);
  const mileageTrend = [...data.mileageSubmissions]
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
    .slice(-8)
    .map((item) => item.mileage);
  const serviceBars = [
    data.maintenanceRecords.filter((item) => item.status === "scheduled")
      .length,
    data.maintenanceRecords.filter((item) => item.status === "assigned").length,
    data.maintenanceRecords.filter((item) => item.status === "in_progress")
      .length,
    completedWork,
  ];

  return (
    <PremiumPage>
      <PremiumGreeting
        eyebrow="Administrator dashboard"
        title="Fleet overview"
        subtitle="Live operational totals calculated from your Supabase records."
      />

      <div className="premium-metric-grid premium-metric-grid-four">
        <PremiumMetric
          icon="truck"
          label="Total vehicles"
          value={formatNumber(data.vehicles.length)}
          detail={`${activeVehicles} currently active`}
        />
        <PremiumMetric
          icon="check"
          tone="green"
          label="Active vehicles"
          value={formatNumber(activeVehicles)}
          detail={`${Math.round((activeVehicles / Math.max(data.vehicles.length, 1)) * 100)}% of fleet`}
        />
        <PremiumMetric
          icon="wrench"
          tone="amber"
          label="Maintenance / inspection"
          value={formatNumber(maintenanceVehicles)}
          detail={`${openWork.length} open work orders`}
        />
        <PremiumMetric
          icon="alert"
          tone="violet"
          label="Out of service"
          value={formatNumber(outOfService)}
          detail="Requires operational review"
        />
      </div>

      <div className="premium-dashboard-grid premium-dashboard-grid-admin">
        <PremiumPanel
          title="Fleet status"
          subtitle="Current vehicle availability"
          className="premium-panel-tall"
        >
          <DonutChart
            centerValue={formatNumber(data.vehicles.length)}
            centerLabel="Total fleet"
            segments={[
              { label: "Active", tone: "green", value: activeVehicles },
              {
                label: "Maintenance",
                tone: "amber",
                value: maintenanceVehicles,
              },
              { label: "Out of service", tone: "red", value: outOfService },
            ]}
          />
        </PremiumPanel>

        <PremiumPanel
          title="Assignment overview"
          subtitle="Driver and vehicle relationships"
          action={<PanelLink to="/operations/assignments">View all</PanelLink>}
        >
          <div className="premium-stat-list">
            <div>
              <span>Active assignments</span>
              <strong>{activeAssignments}</strong>
            </div>
            <div>
              <span>Available drivers</span>
              <strong>{availableDrivers}</strong>
            </div>
            <div>
              <span>Assigned drivers</span>
              <strong>
                {
                  data.driverProfiles.filter(
                    (item) => item.status === "Assigned",
                  ).length
                }
              </strong>
            </div>
            <div>
              <span>Unassigned active vehicles</span>
              <strong>{Math.max(activeVehicles - activeAssignments, 0)}</strong>
            </div>
          </div>
        </PremiumPanel>

        <PremiumPanel
          title="Fleet mileage trend"
          subtitle="Latest submitted odometer readings"
          action={<PanelLink to="/reports">Reports</PanelLink>}
        >
          {mileageTrend.length ? (
            <Sparkline values={mileageTrend} />
          ) : (
            <EmptyDashboardState message="Mileage submissions will appear here." />
          )}
          <div className="premium-inline-summary">
            <div>
              <span>Submissions</span>
              <strong>{data.mileageSubmissions.length}</strong>
            </div>
            <div>
              <span>Highest odometer</span>
              <strong>
                {formatNumber(
                  Math.max(0, ...data.vehicles.map((item) => item.mileage)),
                )}{" "}
                km
              </strong>
            </div>
          </div>
        </PremiumPanel>

        <PremiumPanel
          title="Upcoming schedules"
          subtitle="Nearest maintenance dates"
          action={<PanelLink to="/maintenance/schedules">Calendar</PanelLink>}
        >
          {upcomingSchedules.length ? (
            <div className="premium-list">
              {upcomingSchedules.map((schedule) => {
                const vehicle = data.vehicles.find(
                  (item) => item.id === schedule.vehicleId,
                );
                const service = data.serviceTypes.find(
                  (item) => item.id === schedule.serviceTypeId,
                );
                return (
                  <article key={schedule.id}>
                    <div className="premium-list-icon">
                      <span />
                    </div>
                    <div>
                      <strong>{service?.name ?? "Service"}</strong>
                      <span>
                        {vehicle?.fleetNumber ?? "Vehicle"} ·{" "}
                        {formatDate(schedule.dueDate)}
                      </span>
                    </div>
                    <StatusPill
                      tone={
                        schedule.dueDate < new Date().toISOString().slice(0, 10)
                          ? "danger"
                          : "warning"
                      }
                    >
                      {schedule.dueDate < new Date().toISOString().slice(0, 10)
                        ? "Overdue"
                        : schedule.status}
                    </StatusPill>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyDashboardState message="No upcoming maintenance schedules." />
          )}
        </PremiumPanel>

        <PremiumPanel
          title="Recent work orders"
          subtitle="Latest maintenance activity"
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
                    <StatusPill tone={workTone(work.status)}>
                      {formatStatus(work.status)}
                    </StatusPill>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyDashboardState message="No work orders have been created." />
          )}
        </PremiumPanel>

        <PremiumPanel
          title="Service workflow"
          subtitle="Work-order status distribution"
        >
          <MiniBars values={serviceBars} />
          <div className="premium-chart-labels">
            <span>Scheduled</span>
            <span>Assigned</span>
            <span>In progress</span>
            <span>Completed</span>
          </div>
          <div className="premium-inline-summary">
            <div>
              <span>Completion total</span>
              <strong>{completedWork}</strong>
            </div>
            <div>
              <span>Open total</span>
              <strong>{openWork.length}</strong>
            </div>
          </div>
        </PremiumPanel>

        <PremiumPanel
          title="Recent system activity"
          subtitle="Server-recorded operational actions"
          className="premium-panel-wide"
          action={<PanelLink to="/reports">Audit view</PanelLink>}
        >
          {activity.length ? (
            <div className="premium-activity-grid">
              {activity.map((item) => (
                <article key={item.id}>
                  <span className="activity-dot" />
                  <div>
                    <strong>{item.action}</strong>
                    <span>{item.entityLabel}</span>
                  </div>
                  <time>{formatDate(item.occurredAt)}</time>
                </article>
              ))}
            </div>
          ) : (
            <EmptyDashboardState message="System activity will appear as records are changed." />
          )}
        </PremiumPanel>
      </div>
    </PremiumPage>
  );
}
