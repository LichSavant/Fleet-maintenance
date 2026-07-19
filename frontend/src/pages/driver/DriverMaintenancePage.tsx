import { ErrorState } from "../../components/common/ErrorState";
import { ManagementLoadingState } from "../../components/common/ManagementLoadingState";
import { ServiceMileageTable } from "../../components/common/ServiceMileageTable";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Table } from "../../components/ui/Table";
import { useAuth } from "../../hooks/useAuth";
import { useFleetData } from "../../hooks/useFleetData";
import { operationsViewService } from "../../services/operationsViewService";
import { formatDate } from "../../utils/formatDate";
import { formatStatus } from "../../utils/formatStatus";
import { getStatusTone } from "../../utils/statusTone";

export default function DriverMaintenancePage() {
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useFleetData();

  if (isLoading)
    return <ManagementLoadingState label="Loading vehicle maintenance" />;
  if (error)
    return (
      <ErrorState
        description={error}
        onRetry={reload}
        title="Maintenance could not be loaded"
      />
    );
  if (!data || !user) return null;

  const maintenance = operationsViewService.getDriverMaintenance(data, user.id);
  const openWork = maintenance.workOrders.filter(
    ({ workOrder }) =>
      workOrder.status !== "completed" && workOrder.status !== "cancelled",
  );

  return (
    <div className="role-dashboard-page">
      <PageHeader
        breadcrumbs={[{ label: "Driver" }, { label: "Maintenance" }]}
        eyebrow="Assigned vehicle"
        subtitle="Maintenance reminders and work status are resolved from your active driver assignment."
        title="Vehicle maintenance"
      />
      <Card eyebrow="Current assignment" title="Assigned vehicle status">
        {maintenance.vehicle ? (
          <div className="vehicle-summary">
            <div>
              <strong>{maintenance.vehicle.fleetNumber}</strong>
              <span>
                {maintenance.vehicle.make} {maintenance.vehicle.model} ·{" "}
                {maintenance.vehicle.plateNumber}
              </span>
            </div>
            <StatusBadge tone={getStatusTone(maintenance.vehicle.status)}>
              {maintenance.vehicle.status}
            </StatusBadge>
          </div>
        ) : (
          <p className="table-muted">
            No active vehicle assignment is linked to this account.
          </p>
        )}
      </Card>
      <Card eyebrow="Odometer-based" title="Maintenance reminders">
        <ServiceMileageTable data={data} rows={maintenance.serviceStatuses} />
      </Card>
      <Card eyebrow="Manual planning" title="Service plans">
        <Table
          caption="Manually selected service dates for the assigned vehicle"
          columns={[
            {
              header: "Service",
              key: "service",
              render: ({ serviceType }) => serviceType.name,
            },
            {
              header: "Planned date",
              key: "date",
              render: ({ schedule }) => formatDate(schedule.dueDate),
            },
            {
              header: "Status",
              key: "status",
              render: ({ schedule }) => (
                <StatusBadge tone={getStatusTone(schedule.status)}>
                  {schedule.status}
                </StatusBadge>
              ),
            },
          ]}
          emptyDescription="A manager's manually selected service dates will appear here. These dates do not determine mileage status."
          emptyTitle="No service plans"
          getRowKey={({ schedule }) => schedule.id}
          rows={maintenance.schedules}
        />
      </Card>
      <Card eyebrow="Workshop" title="Active maintenance status">
        <Table
          caption="Active work orders for the assigned vehicle"
          columns={[
            {
              header: "Service",
              key: "service",
              render: ({ serviceType }) => serviceType.name,
            },
            {
              header: "Planned date",
              key: "date",
              render: ({ workOrder }) => formatDate(workOrder.scheduledDate),
            },
            {
              header: "Status",
              key: "status",
              render: ({ workOrder }) => (
                <StatusBadge tone={getStatusTone(workOrder.status)}>
                  {formatStatus(workOrder.status)}
                </StatusBadge>
              ),
            },
          ]}
          emptyDescription="Open workshop work for your assigned vehicle will appear here."
          emptyTitle="No active maintenance work"
          getRowKey={({ workOrder }) => workOrder.id}
          rows={openWork}
        />
      </Card>
    </div>
  );
}
