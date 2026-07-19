import { ErrorState } from "../../components/common/ErrorState";
import { ManagementLoadingState } from "../../components/common/ManagementLoadingState";
import {
  EmptyDashboardState,
  PanelLink,
  PremiumGreeting,
  PremiumMetric,
  PremiumPage,
  PremiumPanel,
  Sparkline,
  StatusPill,
} from "../../components/dashboard/PremiumDashboard";
import truckImage from "../../assets/forgefleet-truck-hero.jpg";
import { useAuth } from "../../hooks/useAuth";
import { useFleetData } from "../../hooks/useFleetData";
import { formatDate, formatNumber } from "../../utils/formatDate";

export default function DriverDashboardPage() {
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useFleetData();
  if (isLoading)
    return <ManagementLoadingState label="Loading driver dashboard" />;
  if (error || !data || !user)
    return (
      <ErrorState
        title="Dashboard could not be loaded"
        description={error || "No driver data is available."}
        onRetry={reload}
      />
    );

  const profile = data.driverProfiles.find((item) => item.userId === user.id);
  const assignment = profile
    ? data.assignments.find(
        (item) =>
          item.driverProfileId === profile.id && item.status === "Active",
      )
    : undefined;
  const vehicle = assignment
    ? data.vehicles.find((item) => item.id === assignment.vehicleId)
    : undefined;
  const mileage = profile
    ? [...data.mileageSubmissions]
        .filter((item) => item.driverProfileId === profile.id)
        .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
    : [];
  const reminders = vehicle
    ? [...data.maintenanceSchedules]
        .filter(
          (item) =>
            item.vehicleId === vehicle.id &&
            !["Converted", "Cancelled"].includes(item.status),
        )
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 4)
    : [];
  const history = vehicle
    ? [...data.maintenanceRecords]
        .filter(
          (item) =>
            item.vehicleId === vehicle.id && item.status === "completed",
        )
        .sort((a, b) =>
          (b.completedDate ?? "").localeCompare(a.completedDate ?? ""),
        )
        .slice(0, 5)
    : [];
  const recentMileage = mileage.slice(-8).map((item) => item.mileage);
  const lastSubmission = mileage.at(-1);

  return (
    <PremiumPage>
      <PremiumGreeting
        eyebrow="Driver dashboard"
        title={`Good morning, ${user.fullName.split(" ")[0]}`}
        subtitle="Your assigned vehicle, mileage activity, and maintenance reminders."
      />
      <div className="premium-driver-overview">
        <PremiumPanel
          title="Today's vehicle"
          subtitle={
            vehicle
              ? `${vehicle.manufacturer} ${vehicle.model}`
              : "No active assignment"
          }
          className="premium-vehicle-card"
        >
          {vehicle ? (
            <div className="driver-vehicle-visual">
              <img src={truckImage} alt="Assigned fleet truck" />
              <div>
                <strong>{vehicle.fleetNumber}</strong>
                <span>{vehicle.plate}</span>
                <StatusPill
                  tone={vehicle.status === "Active" ? "success" : "warning"}
                >
                  {vehicle.status}
                </StatusPill>
              </div>
            </div>
          ) : (
            <EmptyDashboardState message="A manager has not assigned a vehicle to this account." />
          )}
        </PremiumPanel>

        <PremiumPanel
          title="Mileage tracker"
          subtitle="Odometer submission trend"
          action={<PanelLink to="/driver/mileage">Submit</PanelLink>}
        >
          <div className="premium-inline-summary premium-inline-summary-three">
            <div>
              <span>Current</span>
              <strong>{formatNumber(vehicle?.mileage ?? 0)} km</strong>
            </div>
            <div>
              <span>Submissions</span>
              <strong>{mileage.length}</strong>
            </div>
            <div>
              <span>Last entry</span>
              <strong>
                {lastSubmission ? formatNumber(lastSubmission.mileage) : "—"}
              </strong>
            </div>
          </div>
          {recentMileage.length ? (
            <Sparkline values={recentMileage} />
          ) : (
            <EmptyDashboardState message="Your mileage trend starts after the first submission." />
          )}
        </PremiumPanel>

        <PremiumPanel
          title="Maintenance reminders"
          subtitle="Upcoming service for your vehicle"
          action={<PanelLink to="/driver/maintenance">View all</PanelLink>}
        >
          {reminders.length ? (
            <div className="premium-list premium-list-compact">
              {reminders.map((schedule) => {
                const service = data.serviceTypes.find(
                  (item) => item.id === schedule.serviceTypeId,
                );
                const overdue =
                  schedule.dueDate < new Date().toISOString().slice(0, 10);
                return (
                  <article key={schedule.id}>
                    <div>
                      <strong>{service?.name ?? "Maintenance"}</strong>
                      <span>{formatDate(schedule.dueDate)}</span>
                    </div>
                    <StatusPill tone={overdue ? "danger" : "warning"}>
                      {overdue ? "Overdue" : "Upcoming"}
                    </StatusPill>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyDashboardState message="No maintenance reminders for the assigned vehicle." />
          )}
        </PremiumPanel>
      </div>

      <div className="premium-metric-grid premium-metric-grid-three">
        <PremiumMetric
          icon="truck"
          label="Assignment status"
          value={assignment ? "Assigned" : "Unassigned"}
          detail={
            assignment
              ? `Since ${formatDate(assignment.startDate)}`
              : "Waiting for assignment"
          }
        />
        <PremiumMetric
          icon="check"
          tone="green"
          label="Vehicle health"
          value={`${vehicle?.health ?? 0}%`}
          detail={vehicle?.status ?? "No vehicle"}
        />
        <PremiumMetric
          icon="layers"
          tone="amber"
          label="Completed service"
          value={history.length}
          detail="Visible service records"
        />
      </div>

      <PremiumPanel
        title="Recent service history"
        subtitle="Completed maintenance for your assigned vehicle"
        className="premium-panel-wide"
        action={<PanelLink to="/maintenance/history">View all</PanelLink>}
      >
        {history.length ? (
          <div className="premium-work-table premium-work-table-driver">
            <div className="premium-work-row premium-work-head">
              <span>Date</span>
              <span>Service</span>
              <span>Vehicle</span>
              <span>Status</span>
            </div>
            {history.map((work) => {
              const service = data.serviceTypes.find(
                (item) => item.id === work.serviceTypeId,
              );
              return (
                <div className="premium-work-row" key={work.id}>
                  <span>
                    {work.completedDate ? formatDate(work.completedDate) : "—"}
                  </span>
                  <strong>{service?.name ?? "Service"}</strong>
                  <span>{vehicle?.fleetNumber ?? "Vehicle"}</span>
                  <StatusPill tone="success">Completed</StatusPill>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyDashboardState message="Completed maintenance records will appear here." />
        )}
      </PremiumPanel>
    </PremiumPage>
  );
}
