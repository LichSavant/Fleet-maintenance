import { ErrorState } from "../../components/common/ErrorState";
import { ManagementLoadingState } from "../../components/common/ManagementLoadingState";
import { ServiceMileageTable } from "../../components/common/ServiceMileageTable";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Table } from "../../components/ui/Table";
import { useFleetData } from "../../hooks/useFleetData";
import { reportService } from "../../services/reportService";
import { formatDate } from "../../utils/formatDate";

interface ReportItem {
  label: string;
  value: number;
}

interface ReportCardProps {
  items: readonly ReportItem[];
  title: string;
}

function ReportCard({ items, title }: ReportCardProps) {
  const largestValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <Card className="report-card" title={title}>
      <dl className="report-list">
        {items.map((item) => (
          <div key={item.label}>
            <div className="report-value-row">
              <dt>{item.label}</dt>
              <dd>{item.value.toLocaleString()}</dd>
            </div>
            <span
              aria-hidden="true"
              className="report-meter"
              style={{
                width: `${Math.max((item.value / largestValue) * 100, 2)}%`,
              }}
            />
          </div>
        ))}
      </dl>
    </Card>
  );
}

export default function ReportsPage() {
  const { data, error, isLoading, reload } = useFleetData();

  if (isLoading)
    return <ManagementLoadingState label="Calculating frontend reports" />;
  if (error)
    return (
      <ErrorState
        description={error}
        onRetry={reload}
        title="Reports could not be calculated"
      />
    );
  if (!data) return null;

  const reports = reportService.getReports(data);

  return (
    <div className="role-dashboard-page">
      <PageHeader
        breadcrumbs={[{ label: "Workspace" }, { label: "Reports" }]}
        eyebrow="Frontend snapshot"
        subtitle="These summaries are calculated in your browser from the current mock fleet records. They are not server-generated or real-time reports."
        title="Fleet reports"
      />
      <div className="reports-grid">
        <ReportCard
          items={reports.vehicleStatus}
          title="Vehicle status summary"
        />
        <ReportCard
          items={reports.maintenanceStatus}
          title="Maintenance status summary"
        />
        <ReportCard
          items={reports.assignmentSummary}
          title="Assignment summary"
        />
        <ReportCard items={reports.mileageSummary} title="Mileage summary" />
        <ReportCard
          items={reports.serviceDueSummary}
          title="Mileage service status"
        />
        <ReportCard items={reports.userRoleSummary} title="User-role summary" />
      </div>
      <Card
        eyebrow="Preventive maintenance"
        title="Mileage service calculations"
      >
        <ServiceMileageTable
          data={data}
          rows={reports.serviceMileageStatuses}
          showVehicle
        />
      </Card>
      <Card eyebrow="Manual odometer records" title="Recent mileage logs">
        <Table
          caption="Recent driver mileage logs"
          columns={[
            {
              header: "Submission date",
              key: "date",
              render: ({ mileageLog }) => formatDate(mileageLog.logDate),
            },
            {
              header: "Driver",
              key: "driver",
              render: ({ driver }) => driver.fullName,
            },
            {
              header: "Vehicle",
              key: "vehicle",
              render: ({ vehicle }) => vehicle.fleetNumber,
            },
            {
              align: "right",
              header: "Odometer",
              key: "odometer",
              render: ({ mileageLog }) =>
                `${mileageLog.odometerReading.toLocaleString()} km`,
            },
            {
              header: "Notes",
              key: "notes",
              render: ({ mileageLog }) => mileageLog.notes || "No notes",
            },
          ]}
          emptyDescription="Driver-submitted odometer readings will appear here."
          emptyTitle="No mileage logs"
          getRowKey={({ mileageLog }) => mileageLog.id}
          rows={reports.recentMileageLogs}
        />
      </Card>
    </div>
  );
}
