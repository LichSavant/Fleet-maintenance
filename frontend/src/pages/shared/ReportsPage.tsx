import { useState } from "react";

import { ActiveFilters } from "../../components/common/ActiveFilters";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { ManagementLoadingState } from "../../components/common/ManagementLoadingState";
import { ServiceMileageTable } from "../../components/common/ServiceMileageTable";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { SearchInput } from "../../components/ui/SearchInput";
import { Select } from "../../components/ui/Select";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Table } from "../../components/ui/Table";
import { useFleetData } from "../../hooks/useFleetData";
import { DUE_SOON_THRESHOLD_KM } from "../../services/mileageService";
import {
  reportService,
  type ReportBreakdownItem,
} from "../../services/reportService";
import { recordFilterService } from "../../services/recordFilterService";
import type { AssignmentStatus, VehicleStatus } from "../../types/fleet";
import { formatDate } from "../../utils/formatDate";
import {
  formatCount,
  formatCurrency,
  formatKilometers,
} from "../../utils/formatValues";
import { getStatusTone } from "../../utils/statusTone";

interface ReportBreakdownProps {
  formatValue?: (value: number) => string;
  items: readonly ReportBreakdownItem[];
}

function ReportBreakdown({
  formatValue = formatCount,
  items,
}: ReportBreakdownProps) {
  const largestValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <dl className="report-list">
      {items.map((item) => (
        <div key={item.label}>
          <div className="report-value-row">
            <dt>{item.label}</dt>
            <dd>{formatValue(item.value)}</dd>
          </div>
          <span
            aria-hidden="true"
            className="report-meter"
            style={{
              width:
                item.value === 0
                  ? "0%"
                  : `${Math.max((item.value / largestValue) * 100, 2)}%`,
            }}
          />
        </div>
      ))}
    </dl>
  );
}

interface SummaryReportCardProps extends ReportBreakdownProps {
  basis: string;
  eyebrow: string;
  title: string;
  totalLabel: string;
  totalValue: string;
}

function SummaryReportCard({
  basis,
  eyebrow,
  formatValue,
  items,
  title,
  totalLabel,
  totalValue,
}: SummaryReportCardProps) {
  return (
    <Card className="report-card" eyebrow={eyebrow} title={title}>
      <p className="report-basis">
        <strong>Calculation basis:</strong> {basis}
      </p>
      {items.length ? (
        <ReportBreakdown formatValue={formatValue} items={items} />
      ) : (
        <EmptyState
          description="This report will populate when qualifying current records exist."
          title="No report records"
        />
      )}
      <p className="report-total">
        <span>{totalLabel}</span>
        <strong>{totalValue}</strong>
      </p>
    </Card>
  );
}

export default function ReportsPage() {
  const { data, error, isLoading, reload } = useFleetData();
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryStatus, setInventoryStatus] = useState<VehicleStatus | "all">(
    "all",
  );
  const [historySearch, setHistorySearch] = useState("");
  const [historyDateFrom, setHistoryDateFrom] = useState("");
  const [historyDateTo, setHistoryDateTo] = useState("");
  const [mileageSearch, setMileageSearch] = useState("");
  const [logDateFrom, setLogDateFrom] = useState("");
  const [logDateTo, setLogDateTo] = useState("");
  const [mileageFrom, setMileageFrom] = useState("");
  const [mileageTo, setMileageTo] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceTypeId, setServiceTypeId] = useState("all");
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [assignmentStatus, setAssignmentStatus] = useState<
    AssignmentStatus | "all"
  >("all");

  if (isLoading) {
    return <ManagementLoadingState label="Calculating frontend reports" />;
  }
  if (error || !data) {
    return (
      <ErrorState
        description={error || "The current fleet records are unavailable."}
        onRetry={() => void reload()}
        title="Reports could not be calculated"
      />
    );
  }

  const reports = reportService.getReports(data, {
    assignmentSearch,
    assignmentStatus,
    historyDateFrom,
    historyDateTo,
    historySearch,
    inventorySearch,
    inventoryStatus,
    mileageSearch,
    serviceSearch,
    serviceTypeId,
  });
  const mileageLogs = recordFilterService.filterMileageLogs(
    reports.recentMileageLogs,
    {
      dateFrom: logDateFrom,
      dateTo: logDateTo,
      mileageFrom,
      mileageTo,
      search: mileageSearch,
    },
  );

  const inventoryFilters = [
    inventorySearch.trim() ? `Search: “${inventorySearch.trim()}”` : "",
    inventoryStatus !== "all" ? `Status: ${inventoryStatus}` : "",
  ].filter(Boolean);
  const historyFilters = [
    historySearch.trim() ? `Search: “${historySearch.trim()}”` : "",
    historyDateFrom ? `Service date from: ${historyDateFrom}` : "",
    historyDateTo ? `Service date to: ${historyDateTo}` : "",
  ].filter(Boolean);
  const mileageFilters = [
    mileageSearch.trim() ? `Search: “${mileageSearch.trim()}”` : "",
    logDateFrom ? `Log date from: ${logDateFrom}` : "",
    logDateTo ? `Log date to: ${logDateTo}` : "",
    mileageFrom ? `Mileage from: ${mileageFrom} km` : "",
    mileageTo ? `Mileage to: ${mileageTo} km` : "",
  ].filter(Boolean);
  const serviceFilters = [
    serviceSearch.trim() ? `Search: “${serviceSearch.trim()}”` : "",
    serviceTypeId !== "all"
      ? `Service: ${data.serviceTypes.find((item) => item.id === serviceTypeId)?.name ?? serviceTypeId}`
      : "",
  ].filter(Boolean);
  const assignmentFilters = [
    assignmentSearch.trim() ? `Search: “${assignmentSearch.trim()}”` : "",
    assignmentStatus !== "all" ? `Status: ${assignmentStatus}` : "",
  ].filter(Boolean);

  return (
    <div className="role-dashboard-page reports-page">
      <PageHeader
        breadcrumbs={[{ label: "Workspace" }, { label: "Reports" }]}
        eyebrow="Frontend demonstration"
        subtitle="Every total below is calculated in the browser from the current centralized fleet records; no live-server or calendar-based automatic report is used."
        title="Fleet reports"
      />

      <Card eyebrow="Report 1" title="Vehicle inventory summary">
        <p className="report-basis">
          <strong>Calculation basis:</strong> current vehicle records, grouped
          by controlled vehicle status. The table and status meters use the same
          filtered rows.
        </p>
        <div className="management-toolbar report-filter-toolbar">
          <SearchInput
            id="report-inventory-search"
            label="Search vehicle inventory report"
            onChange={setInventorySearch}
            placeholder="Search plate, VIN, make, model, or driver"
            value={inventorySearch}
          />
          <label className="toolbar-field">
            <span>Vehicle status</span>
            <Select
              onChange={(event) =>
                setInventoryStatus(event.target.value as typeof inventoryStatus)
              }
              value={inventoryStatus}
            >
              <option value="all">All statuses</option>
              <option value="Active">Active</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Inspection">Inspection</option>
              <option value="Out of Service">Out of service</option>
            </Select>
          </label>
          <ActiveFilters
            filters={inventoryFilters}
            onClear={() => {
              setInventorySearch("");
              setInventoryStatus("all");
            }}
          />
        </div>
        <ReportBreakdown items={reports.vehicleInventory.byStatus} />
        <p className="report-total">
          <span>Vehicles included</span>
          <strong>
            {formatCount(reports.vehicleInventory.total)} of{" "}
            {formatCount(reports.vehicleInventory.sourceTotal)}
          </strong>
        </p>
        <Table
          caption="Vehicle inventory report"
          columns={[
            {
              header: "Vehicle",
              key: "vehicle",
              render: ({ vehicle }) =>
                `${vehicle.fleetNumber} · ${vehicle.plateNumber}`,
            },
            {
              header: "VIN",
              key: "vin",
              render: ({ vehicle }) => vehicle.vin,
            },
            {
              header: "Make and model",
              key: "model",
              render: ({ vehicle }) => `${vehicle.make} ${vehicle.model}`,
            },
            {
              align: "right",
              header: "Current mileage",
              key: "mileage",
              render: ({ vehicle }) => formatKilometers(vehicle.currentMileage),
            },
            {
              header: "Assigned driver",
              key: "driver",
              render: ({ assignedDriver }) =>
                assignedDriver?.fullName ?? "Unassigned",
            },
            {
              header: "Status",
              key: "status",
              render: ({ vehicle }) => (
                <StatusBadge tone={getStatusTone(vehicle.status)}>
                  {vehicle.status}
                </StatusBadge>
              ),
            },
          ]}
          emptyDescription="Adjust or clear the inventory filters to include other current vehicles."
          emptyTitle="No matching vehicles"
          getRowKey={({ vehicle }) => vehicle.id}
          rows={reports.vehicleInventory.rows}
        />
      </Card>

      <Card eyebrow="Report 2" title="Vehicle maintenance history">
        <p className="report-basis">
          <strong>Calculation basis:</strong> completed maintenance-history
          records joined to their vehicle, service type, and mechanic. Manual
          service dates identify recorded events but do not calculate urgency.
        </p>
        <div className="management-toolbar report-filter-toolbar">
          <SearchInput
            id="report-history-search"
            label="Search maintenance history report"
            onChange={setHistorySearch}
            placeholder="Search plate, service type, or mechanic"
            value={historySearch}
          />
          <label className="toolbar-field">
            <span>Service date from</span>
            <Input
              aria-label="Report service date from"
              max={historyDateTo || undefined}
              onChange={(event) => setHistoryDateFrom(event.target.value)}
              type="date"
              value={historyDateFrom}
            />
          </label>
          <label className="toolbar-field">
            <span>Service date to</span>
            <Input
              aria-label="Report service date to"
              min={historyDateFrom || undefined}
              onChange={(event) => setHistoryDateTo(event.target.value)}
              type="date"
              value={historyDateTo}
            />
          </label>
          <ActiveFilters
            filters={historyFilters}
            onClear={() => {
              setHistorySearch("");
              setHistoryDateFrom("");
              setHistoryDateTo("");
            }}
          />
        </div>
        <p className="report-total">
          <span>Completed services included</span>
          <strong>
            {formatCount(reports.maintenanceHistory.totalRecords)} of{" "}
            {formatCount(reports.maintenanceHistory.sourceTotal)}
          </strong>
        </p>
        <Table
          caption="Vehicle maintenance history report"
          columns={[
            {
              header: "Service date",
              key: "date",
              render: ({ history }) => formatDate(history.serviceDate),
            },
            {
              header: "Vehicle",
              key: "vehicle",
              render: ({ vehicle }) =>
                `${vehicle.fleetNumber} · ${vehicle.plateNumber}`,
            },
            {
              header: "Service type",
              key: "service",
              render: ({ serviceType }) => serviceType.name,
            },
            {
              header: "Mechanic",
              key: "mechanic",
              render: ({ mechanic }) =>
                mechanic?.fullName ?? "Historical account",
            },
            {
              align: "right",
              header: "Service mileage",
              key: "mileage",
              render: ({ history }) =>
                formatKilometers(history.odometerAtService),
            },
            {
              align: "right",
              header: "Cost",
              key: "cost",
              render: ({ history }) => formatCurrency(history.totalCost),
            },
          ]}
          emptyDescription="Adjust or clear the maintenance-history filters to review other completed service records."
          emptyTitle="No matching maintenance history"
          getRowKey={({ history }) => history.id}
          rows={reports.maintenanceHistory.rows}
        />
      </Card>

      <div className="reports-grid">
        <SummaryReportCard
          basis={`${formatCount(reports.maintenanceHistory.totalRecords)} filtered completed-service records, grouped by service type; each value is the sum of recorded totalCost fields.`}
          eyebrow="Report 7"
          formatValue={formatCurrency}
          items={reports.maintenanceHistory.costByServiceType.map((row) => ({
            label: `${row.serviceType.name} (${formatCount(row.recordCount)} records)`,
            value: row.totalCost,
          }))}
          title="Maintenance-cost summary"
          totalLabel={`Total · average ${formatCurrency(reports.maintenanceHistory.averageCost)}`}
          totalValue={formatCurrency(reports.maintenanceHistory.totalCost)}
        />
        <SummaryReportCard
          basis="all current maintenance work-order records, grouped by validated workflow status."
          eyebrow="Report 9"
          items={reports.workOrders.byStatus}
          title="Work-order status summary"
          totalLabel="Total work orders"
          totalValue={formatCount(reports.workOrders.total)}
        />
        <SummaryReportCard
          basis="all current user records, grouped by the account role stored on each user."
          eyebrow="Report 10"
          items={reports.userRoles.byRole}
          title="User-role summary"
          totalLabel="Total users"
          totalValue={formatCount(reports.userRoles.total)}
        />
      </div>

      <Card eyebrow="Report 3" title="Mileage summary by vehicle">
        <p className="report-basis">
          <strong>Calculation basis:</strong> current vehicle odometers and
          manual mileage logs. Logged distance is the highest minus lowest
          reading per vehicle; combined odometers are labelled separately and
          are not presented as travelled distance.
        </p>
        <div className="management-toolbar report-filter-toolbar">
          <SearchInput
            id="report-mileage-search"
            label="Search mileage report"
            onChange={setMileageSearch}
            placeholder="Search fleet number, plate, make, or model"
            value={mileageSearch}
          />
          <label className="toolbar-field">
            <span>Log date from</span>
            <Input
              aria-label="Mileage report log date from"
              max={logDateTo || undefined}
              onChange={(event) => setLogDateFrom(event.target.value)}
              type="date"
              value={logDateFrom}
            />
          </label>
          <label className="toolbar-field">
            <span>Log date to</span>
            <Input
              aria-label="Mileage report log date to"
              min={logDateFrom || undefined}
              onChange={(event) => setLogDateTo(event.target.value)}
              type="date"
              value={logDateTo}
            />
          </label>
          <label className="toolbar-field">
            <span>Minimum log mileage</span>
            <Input
              aria-label="Minimum report mileage log reading"
              min="0"
              onChange={(event) => setMileageFrom(event.target.value)}
              type="number"
              value={mileageFrom}
            />
          </label>
          <label className="toolbar-field">
            <span>Maximum log mileage</span>
            <Input
              aria-label="Maximum report mileage log reading"
              min="0"
              onChange={(event) => setMileageTo(event.target.value)}
              type="number"
              value={mileageTo}
            />
          </label>
          <ActiveFilters
            filters={mileageFilters}
            onClear={() => {
              setMileageSearch("");
              setLogDateFrom("");
              setLogDateTo("");
              setMileageFrom("");
              setMileageTo("");
            }}
          />
        </div>
        <div className="report-stat-grid" aria-label="Mileage report totals">
          <div>
            <span>Vehicles included</span>
            <strong>
              {formatCount(reports.mileageByVehicle.totalVehicles)}
            </strong>
          </div>
          <div>
            <span>Manual logs</span>
            <strong>{formatCount(reports.mileageByVehicle.totalLogs)}</strong>
          </div>
          <div>
            <span>Combined current odometers</span>
            <strong>
              {formatKilometers(
                reports.mileageByVehicle.combinedCurrentOdometers,
              )}
            </strong>
          </div>
          <div>
            <span>Distance between logged readings</span>
            <strong>
              {formatKilometers(reports.mileageByVehicle.totalLoggedDistance)}
            </strong>
          </div>
        </div>
        <Table
          caption="Mileage summary by vehicle"
          columns={[
            {
              header: "Vehicle",
              key: "vehicle",
              render: ({ vehicle }) =>
                `${vehicle.fleetNumber} · ${vehicle.plateNumber}`,
            },
            {
              align: "right",
              header: "Current mileage",
              key: "current",
              render: ({ currentMileage }) => formatKilometers(currentMileage),
            },
            {
              align: "right",
              header: "Latest manual reading",
              key: "latest",
              render: ({ latestLoggedMileage }) =>
                formatKilometers(latestLoggedMileage),
            },
            {
              header: "Latest log date",
              key: "date",
              render: ({ latestLogDate }) =>
                latestLogDate ? formatDate(latestLogDate) : "No logs",
            },
            {
              align: "right",
              header: "Log count",
              key: "count",
              render: ({ logCount }) => formatCount(logCount),
            },
            {
              align: "right",
              header: "Logged distance",
              key: "distance",
              render: ({ loggedDistanceKm }) =>
                formatKilometers(loggedDistanceKm),
            },
          ]}
          emptyDescription="Clear the mileage search to include other current vehicles."
          emptyTitle="No matching vehicle mileage"
          getRowKey={({ vehicle }) => vehicle.id}
          rows={reports.mileageByVehicle.rows}
        />
        <div className="report-subsection">
          <h3>Manual mileage-log detail</h3>
          <p className="report-basis">
            <strong>Calculation basis:</strong> driver-submitted mileage-log
            records joined to the recorded driver and vehicle. Date and mileage
            ranges apply only to this detail table.
          </p>
          <p className="report-total">
            <span>Manual logs included</span>
            <strong>
              {formatCount(mileageLogs.length)} of{" "}
              {formatCount(reports.recentMileageLogs.length)}
            </strong>
          </p>
          <Table
            caption="Filtered driver mileage logs"
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
                  formatKilometers(mileageLog.odometerReading),
              },
            ]}
            emptyDescription="Adjust or clear the mileage-log filters to review other manual readings."
            emptyTitle="No matching mileage logs"
            getRowKey={({ mileageLog }) => mileageLog.id}
            rows={mileageLogs}
          />
        </div>
      </Card>

      <Card eyebrow="Reports 4–6" title="Mileage-based service reports">
        <p className="report-basis">
          <strong>Calculation basis:</strong> for every current vehicle and
          active service type, next service mileage equals last completed
          service mileage plus the recommended interval. Remaining distance is
          next service mileage minus current vehicle mileage. Manual scheduled
          dates are not used.
        </p>
        <div className="management-toolbar report-filter-toolbar">
          <SearchInput
            id="report-service-search"
            label="Search mileage service reports"
            onChange={setServiceSearch}
            placeholder="Search vehicle or service type"
            value={serviceSearch}
          />
          <label className="toolbar-field">
            <span>Service type</span>
            <Select
              onChange={(event) => setServiceTypeId(event.target.value)}
              value={serviceTypeId}
            >
              <option value="all">All active service types</option>
              {data.serviceTypes
                .filter((serviceType) => serviceType.status === "Active")
                .map((serviceType) => (
                  <option key={serviceType.id} value={serviceType.id}>
                    {serviceType.name}
                  </option>
                ))}
            </Select>
          </label>
          <ActiveFilters
            filters={serviceFilters}
            onClear={() => {
              setServiceSearch("");
              setServiceTypeId("all");
            }}
          />
        </div>
        <ReportBreakdown items={reports.services.byStatus} />
        <p className="report-total">
          <span>Service calculations included</span>
          <strong>
            {formatCount(reports.services.total)} of{" "}
            {formatCount(reports.services.sourceTotal)}
          </strong>
        </p>
      </Card>

      <Card eyebrow="Report 4" title="Upcoming mileage-based services">
        <p className="report-basis">
          <strong>Calculation basis:</strong> remaining distance is greater than{" "}
          {formatKilometers(DUE_SOON_THRESHOLD_KM)}.
        </p>
        <p className="report-total">
          <span>Upcoming services</span>
          <strong>{formatCount(reports.services.upcoming.length)}</strong>
        </p>
        <ServiceMileageTable
          caption="Upcoming mileage-based services"
          data={data}
          emptyDescription="No filtered vehicle and service pair is currently above the due-soon threshold."
          emptyTitle="No upcoming services"
          rows={reports.services.upcoming.map((row) => row.calculation)}
          showVehicle
        />
      </Card>

      <Card eyebrow="Report 5" title="Due-soon services">
        <p className="report-basis">
          <strong>Calculation basis:</strong> remaining distance is from 1 km
          through {formatKilometers(DUE_SOON_THRESHOLD_KM)}.
        </p>
        <p className="report-total">
          <span>Due-soon services</span>
          <strong>{formatCount(reports.services.dueSoon.length)}</strong>
        </p>
        <ServiceMileageTable
          caption="Due-soon mileage-based services"
          data={data}
          emptyDescription="No filtered vehicle and service pair is currently within the due-soon mileage threshold."
          emptyTitle="No due-soon services"
          rows={reports.services.dueSoon.map((row) => row.calculation)}
          showVehicle
        />
      </Card>

      <Card eyebrow="Report 6" title="Overdue services">
        <p className="report-basis">
          <strong>Calculation basis:</strong> remaining distance is below 0 km
          because current mileage has passed next service mileage.
        </p>
        <p className="report-total">
          <span>Overdue services</span>
          <strong>{formatCount(reports.services.overdue.length)}</strong>
        </p>
        <ServiceMileageTable
          caption="Overdue mileage-based services"
          data={data}
          emptyDescription="No filtered vehicle and service pair has passed its next service mileage."
          emptyTitle="No overdue services"
          rows={reports.services.overdue.map((row) => row.calculation)}
          showVehicle
        />
      </Card>

      <Card eyebrow="Report 8" title="Driver assignment report">
        <p className="report-basis">
          <strong>Calculation basis:</strong> current and historical
          vehicle-assignment records joined to their driver and vehicle. No
          assignment is inferred from a dashboard value.
        </p>
        <div className="management-toolbar report-filter-toolbar">
          <SearchInput
            id="report-assignment-search"
            label="Search driver assignment report"
            onChange={setAssignmentSearch}
            placeholder="Search driver, fleet number, or plate"
            value={assignmentSearch}
          />
          <label className="toolbar-field">
            <span>Assignment status</span>
            <Select
              onChange={(event) =>
                setAssignmentStatus(
                  event.target.value as typeof assignmentStatus,
                )
              }
              value={assignmentStatus}
            >
              <option value="all">All assignments</option>
              <option value="Active">Active</option>
              <option value="Ended">Historical</option>
            </Select>
          </label>
          <ActiveFilters
            filters={assignmentFilters}
            onClear={() => {
              setAssignmentSearch("");
              setAssignmentStatus("all");
            }}
          />
        </div>
        <ReportBreakdown items={reports.assignments.byStatus} />
        <p className="report-total">
          <span>Assignments included</span>
          <strong>
            {formatCount(reports.assignments.total)} of{" "}
            {formatCount(reports.assignments.sourceTotal)}
          </strong>
        </p>
        <Table
          caption="Driver assignment report"
          columns={[
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
              header: "Start date",
              key: "start",
              render: ({ assignment }) => formatDate(assignment.startDate),
            },
            {
              header: "End date",
              key: "end",
              render: ({ assignment }) =>
                assignment.endDate ? formatDate(assignment.endDate) : "Current",
            },
            {
              header: "Status",
              key: "status",
              render: ({ assignment }) => (
                <StatusBadge tone={getStatusTone(assignment.status)}>
                  {assignment.status}
                </StatusBadge>
              ),
            },
          ]}
          emptyDescription="Adjust or clear the assignment filters to review other assignment records."
          emptyTitle="No matching assignments"
          getRowKey={({ assignment }) => assignment.id}
          rows={reports.assignments.rows}
        />
      </Card>
    </div>
  );
}
