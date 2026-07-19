import { ErrorState } from "../../components/common/ErrorState";
import { ManagementLoadingState } from "../../components/common/ManagementLoadingState";
import {
  EmptyDashboardState,
  PanelLink,
  PremiumGreeting,
  PremiumMetric,
  PremiumPage,
  PremiumPanel,
  StatusPill,
} from "../../components/dashboard/PremiumDashboard";
import { useAuth } from "../../hooks/useAuth";
import { useFleetData } from "../../hooks/useFleetData";
import { formatDate } from "../../utils/formatDate";
import { formatStatus } from "../../utils/formatStatus";

export default function MechanicDashboardPage() {
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useFleetData();
  if (isLoading)
    return <ManagementLoadingState label="Loading mechanic dashboard" />;
  if (error || !data || !user)
    return (
      <ErrorState
        title="Dashboard could not be loaded"
        description={error || "No mechanic data is available."}
        onRetry={reload}
      />
    );

  const profile = data.mechanicProfiles.find((item) => item.userId === user.id);
  const assigned = profile
    ? data.maintenanceRecords.filter(
        (item) => item.mechanicProfileId === profile.id,
      )
    : [];
  const open = assigned.filter(
    (item) => !["completed", "cancelled"].includes(item.status),
  );
  const inProgress = assigned.filter((item) => item.status === "in_progress");
  const completedToday = assigned.filter(
    (item) =>
      item.status === "completed" &&
      item.completedDate === new Date().toISOString().slice(0, 10),
  );
  const pending = assigned.filter((item) =>
    ["scheduled", "assigned"].includes(item.status),
  );
  const recentHistory = [...assigned]
    .filter((item) => item.status === "completed")
    .sort((a, b) =>
      (b.completedDate ?? "").localeCompare(a.completedDate ?? ""),
    )
    .slice(0, 5);

  return (
    <PremiumPage>
      <PremiumGreeting
        eyebrow={profile?.specialty ?? "Mechanic dashboard"}
        title={`Welcome back, ${user.fullName.split(" ")[0]}`}
        subtitle="Your assigned work, active maintenance tasks, and completed service records."
      />
      <div className="premium-metric-grid premium-metric-grid-four">
        <PremiumMetric
          icon="wrench"
          label="Assigned work orders"
          value={assigned.length}
          detail={`${open.length} still open`}
        />
        <PremiumMetric
          icon="info"
          tone="blue"
          label="In progress"
          value={inProgress.length}
          detail="Currently being serviced"
        />
        <PremiumMetric
          icon="check"
          tone="green"
          label="Completed today"
          value={completedToday.length}
          detail="Finished service tasks"
        />
        <PremiumMetric
          icon="alert"
          tone="amber"
          label="Pending"
          value={pending.length}
          detail="Scheduled or assigned"
        />
      </div>

      <div className="premium-dashboard-grid premium-dashboard-grid-mechanic">
        <PremiumPanel
          title="My work orders"
          subtitle="Assigned maintenance tasks"
          className="premium-panel-wide"
          action={<PanelLink to="/maintenance/work-orders">View all</PanelLink>}
        >
          {open.length ? (
            <div
              className="premium-work-table"
              role="table"
              aria-label="Assigned work orders"
            >
              <div className="premium-work-row premium-work-head" role="row">
                <span>Vehicle</span>
                <span>Service</span>
                <span>Date</span>
                <span>Priority</span>
                <span>Status</span>
              </div>
              {open.slice(0, 7).map((work) => {
                const vehicle = data.vehicles.find(
                  (item) => item.id === work.vehicleId,
                );
                const service = data.serviceTypes.find(
                  (item) => item.id === work.serviceTypeId,
                );
                return (
                  <div className="premium-work-row" role="row" key={work.id}>
                    <strong>{vehicle?.fleetNumber ?? "Vehicle"}</strong>
                    <span>{service?.name ?? "Maintenance"}</span>
                    <span>{formatDate(work.scheduledDate)}</span>
                    <StatusPill
                      tone={
                        work.priority === "High"
                          ? "danger"
                          : work.priority === "Medium"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {work.priority}
                    </StatusPill>
                    <StatusPill
                      tone={work.status === "in_progress" ? "info" : "warning"}
                    >
                      {formatStatus(work.status)}
                    </StatusPill>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyDashboardState message="No open work orders are assigned to you." />
          )}
        </PremiumPanel>

        <PremiumPanel
          title="Maintenance queue"
          subtitle="Work grouped by current stage"
        >
          <div className="premium-queue-cards">
            <article>
              <span className="queue-dot queue-dot-red" />
              <div>
                <strong>
                  {
                    assigned.filter(
                      (item) =>
                        item.priority === "High" &&
                        !["completed", "cancelled"].includes(item.status),
                    ).length
                  }
                </strong>
                <span>High priority</span>
              </div>
            </article>
            <article>
              <span className="queue-dot queue-dot-blue" />
              <div>
                <strong>{inProgress.length}</strong>
                <span>In progress</span>
              </div>
            </article>
            <article>
              <span className="queue-dot queue-dot-amber" />
              <div>
                <strong>{pending.length}</strong>
                <span>Waiting to start</span>
              </div>
            </article>
          </div>
        </PremiumPanel>

        <PremiumPanel
          title="Service history"
          subtitle="Recently completed work"
          action={<PanelLink to="/maintenance/history">View all</PanelLink>}
        >
          {recentHistory.length ? (
            <div className="premium-list premium-list-compact">
              {recentHistory.map((work) => {
                const vehicle = data.vehicles.find(
                  (item) => item.id === work.vehicleId,
                );
                const service = data.serviceTypes.find(
                  (item) => item.id === work.serviceTypeId,
                );
                return (
                  <article key={work.id}>
                    <div>
                      <strong>{service?.name ?? "Service"}</strong>
                      <span>
                        {vehicle?.fleetNumber ?? "Vehicle"} ·{" "}
                        {work.completedDate
                          ? formatDate(work.completedDate)
                          : "Completed"}
                      </span>
                    </div>
                    <StatusPill tone="success">Completed</StatusPill>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyDashboardState message="Completed work will appear here." />
          )}
        </PremiumPanel>
      </div>
    </PremiumPage>
  );
}
