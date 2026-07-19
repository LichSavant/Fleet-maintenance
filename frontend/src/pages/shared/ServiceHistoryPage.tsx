import { useMemo, useState } from "react";

import { ActiveFilters } from "../../components/common/ActiveFilters";
import { ErrorState } from "../../components/common/ErrorState";
import { HistoryCorrectionModal } from "../../components/common/HistoryCorrectionModal";
import { ManagementLoadingState } from "../../components/common/ManagementLoadingState";
import { ManagementPage } from "../../components/common/ManagementPage";
import { SearchInput } from "../../components/ui/SearchInput";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Table, type TableColumn } from "../../components/ui/Table";
import { useAuth } from "../../hooks/useAuth";
import { useFleetData } from "../../hooks/useFleetData";
import {
  operationsViewService,
  type ServiceHistoryOperationalView,
} from "../../services/operationsViewService";
import { fleetDataService } from "../../services/fleetDataService";
import { recordFilterService } from "../../services/recordFilterService";
import { formatDate } from "../../utils/formatDate";

export default function ServiceHistoryPage() {
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useFleetData();
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [mileageFrom, setMileageFrom] = useState("");
  const [mileageTo, setMileageTo] = useState("");
  const [correcting, setCorrecting] =
    useState<ServiceHistoryOperationalView | null>(null);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);

  const rows = useMemo(() => {
    if (!data || !user) return [];
    let history = operationsViewService.getServiceHistory(data);
    if (user.role === "mechanic") {
      const profile = data.mechanicProfiles.find(
        (item) => item.userId === user.id,
      );
      history = history.filter(
        ({ history: record }) => record.mechanicId === profile?.id,
      );
    }
    if (user.role === "driver") {
      const maintenance = operationsViewService.getDriverMaintenance(
        data,
        user.id,
      );
      history = history.filter(
        ({ vehicle }) => vehicle.id === maintenance.vehicle?.id,
      );
    }
    return recordFilterService
      .filterServiceHistory(history, {
        dateFrom,
        dateTo,
        mileageFrom,
        mileageTo,
        search,
      })
      .sort((left, right) =>
        right.history.serviceDate.localeCompare(left.history.serviceDate),
      );
  }, [data, dateFrom, dateTo, mileageFrom, mileageTo, search, user]);

  const activeFilters = [
    search.trim() ? `Search: “${search.trim()}”` : "",
    dateFrom ? `Service date from: ${dateFrom}` : "",
    dateTo ? `Service date to: ${dateTo}` : "",
    mileageFrom ? `Mileage from: ${mileageFrom} km` : "",
    mileageTo ? `Mileage to: ${mileageTo} km` : "",
  ].filter(Boolean);

  const columns: Array<TableColumn<ServiceHistoryOperationalView>> = [
    {
      header: "Service",
      key: "service",
      render: ({ serviceType, vehicle }) => (
        <div className="primary-cell">
          <strong>{serviceType.name}</strong>
          <span>
            {vehicle.fleetNumber} · {vehicle.plateNumber}
          </span>
        </div>
      ),
    },
    {
      header: "Completed",
      key: "completed",
      render: ({ history }) => formatDate(history.serviceDate),
    },
    {
      header: "Mechanic",
      key: "mechanic",
      render: ({ mechanic }) => mechanic?.fullName ?? "Historical account",
    },
    {
      header: "Service notes",
      key: "notes",
      render: ({ history }) => history.notes || "No service notes",
    },
    {
      align: "right",
      header: "Mileage",
      key: "mileage",
      render: ({ history }) =>
        `${history.odometerAtService.toLocaleString()} km`,
    },
    {
      align: "right",
      header: "Cost",
      key: "cost",
      render: ({ history }) =>
        new Intl.NumberFormat(undefined, {
          currency: "PHP",
          style: "currency",
        }).format(history.totalCost),
    },
    ...(user?.role === "admin"
      ? [
          {
            align: "right" as const,
            header: "Actions",
            key: "actions",
            render: (record: ServiceHistoryOperationalView) => (
              <Button
                onClick={() => setCorrecting(record)}
                size="small"
                variant="ghost"
              >
                Correct
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <ManagementPage
      breadcrumb="Service history"
      controls={
        <>
          <SearchInput
            id="service-history-search"
            label="Search service history"
            onChange={setSearch}
            placeholder="Search plate, service, mechanic, or status"
            value={search}
          />
          <label className="toolbar-field">
            <span>Service date from</span>
            <Input
              aria-label="Service date from"
              max={dateTo || undefined}
              onChange={(event) => setDateFrom(event.target.value)}
              type="date"
              value={dateFrom}
            />
          </label>
          <label className="toolbar-field">
            <span>Service date to</span>
            <Input
              aria-label="Service date to"
              min={dateFrom || undefined}
              onChange={(event) => setDateTo(event.target.value)}
              type="date"
              value={dateTo}
            />
          </label>
          <label className="toolbar-field">
            <span>Minimum mileage</span>
            <Input
              aria-label="Minimum service mileage"
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
              aria-label="Maximum service mileage"
              min="0"
              onChange={(event) => setMileageTo(event.target.value)}
              placeholder="Any"
              type="number"
              value={mileageTo}
            />
          </label>
          <ActiveFilters
            filters={activeFilters}
            onClear={() => {
              setSearch("");
              setDateFrom("");
              setDateTo("");
              setMileageFrom("");
              setMileageTo("");
            }}
          />
        </>
      }
      description="Completed work orders form one authoritative history. Record identity and relationships remain immutable; administrators may make explicit audited corrections."
      feedback={feedback}
      title="Service history"
    >
      {isLoading ? (
        <ManagementLoadingState label="Loading service history" />
      ) : error ? (
        <ErrorState
          description={error}
          onRetry={reload}
          title="Service history could not be loaded"
        />
      ) : (
        <Table
          caption="Completed vehicle service history"
          columns={columns}
          emptyDescription={
            activeFilters.length
              ? "Adjust or clear the active search and filters to review other completed service records."
              : "Completed work appropriate to your current account will appear here."
          }
          emptyTitle={
            activeFilters.length
              ? "No matching service history"
              : "No completed service"
          }
          getRowKey={({ history }) => history.id}
          rows={rows}
        />
      )}
      {correcting && user && (
        <HistoryCorrectionModal
          history={correcting.history}
          isOpen
          onClose={() => setCorrecting(null)}
          onSubmit={async (input) => {
            await fleetDataService.correctMaintenanceHistory(
              correcting.history.id,
              input,
              user.id,
            );
            setFeedback({
              message: "Maintenance history corrected with an audit event.",
              tone: "success",
            });
            setCorrecting(null);
            await reload();
          }}
        />
      )}
    </ManagementPage>
  );
}
