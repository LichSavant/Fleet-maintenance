import { useState } from "react";

import { ActiveFilters } from "../../components/common/ActiveFilters";
import { ErrorState } from "../../components/common/ErrorState";
import { ManagementLoadingState } from "../../components/common/ManagementLoadingState";
import { ServiceMileageTable } from "../../components/common/ServiceMileageTable";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { SearchInput } from "../../components/ui/SearchInput";
import { Table } from "../../components/ui/Table";
import { useFleetData } from "../../hooks/useFleetData";
import { reportService } from "../../services/reportService";
import { recordFilterService } from "../../services/recordFilterService";
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
  const [mileageSearch, setMileageSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [mileageFrom, setMileageFrom] = useState("");
  const [mileageTo, setMileageTo] = useState("");

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
  const mileageLogs = recordFilterService.filterMileageLogs(
    reports.recentMileageLogs,
    {
      dateFrom,
      dateTo,
      mileageFrom,
      mileageTo,
      search: mileageSearch,
    },
  );
  const activeMileageFilters = [
    mileageSearch.trim() ? `Search: “${mileageSearch.trim()}”` : "",
    dateFrom ? `Log date from: ${dateFrom}` : "",
    dateTo ? `Log date to: ${dateTo}` : "",
    mileageFrom ? `Mileage from: ${mileageFrom} km` : "",
    mileageTo ? `Mileage to: ${mileageTo} km` : "",
  ].filter(Boolean);

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
        <div className="management-toolbar report-filter-toolbar">
          <SearchInput
            id="mileage-log-search"
            label="Search mileage logs"
            onChange={setMileageSearch}
            placeholder="Search plate number or driver"
            value={mileageSearch}
          />
          <label className="toolbar-field">
            <span>Log date from</span>
            <Input
              aria-label="Mileage log date from"
              max={dateTo || undefined}
              onChange={(event) => setDateFrom(event.target.value)}
              type="date"
              value={dateFrom}
            />
          </label>
          <label className="toolbar-field">
            <span>Log date to</span>
            <Input
              aria-label="Mileage log date to"
              min={dateFrom || undefined}
              onChange={(event) => setDateTo(event.target.value)}
              type="date"
              value={dateTo}
            />
          </label>
          <label className="toolbar-field">
            <span>Minimum mileage</span>
            <Input
              aria-label="Minimum mileage log reading"
              min="0"
              onChange={(event) => setMileageFrom(event.target.value)}
              placeholder="0"
              type="number"
              value={mileageFrom}
            />
          </label>
          <label className="toolbar-field">
            <span>Maximum mileage</span>
            <Input
              aria-label="Maximum mileage log reading"
              min="0"
              onChange={(event) => setMileageTo(event.target.value)}
              placeholder="Any"
              type="number"
              value={mileageTo}
            />
          </label>
          <ActiveFilters
            filters={activeMileageFilters}
            onClear={() => {
              setMileageSearch("");
              setDateFrom("");
              setDateTo("");
              setMileageFrom("");
              setMileageTo("");
            }}
          />
        </div>
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
              render: ({ vehicle }) =>
                `${vehicle.fleetNumber} · ${vehicle.plateNumber}`,
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
          emptyDescription={
            activeMileageFilters.length
              ? "Adjust or clear the active search and filters to review other mileage logs."
              : "Driver-submitted odometer readings will appear here."
          }
          emptyTitle={
            activeMileageFilters.length
              ? "No matching mileage logs"
              : "No mileage logs"
          }
          getRowKey={({ mileageLog }) => mileageLog.id}
          rows={mileageLogs}
        />
      </Card>
    </div>
  );
}
