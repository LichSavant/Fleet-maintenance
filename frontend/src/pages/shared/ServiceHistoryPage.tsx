import { useMemo, useState } from "react";

import { ErrorState } from "../../components/common/ErrorState";
import { ManagementLoadingState } from "../../components/common/ManagementLoadingState";
import { ManagementPage } from "../../components/common/ManagementPage";
import { SearchInput } from "../../components/ui/SearchInput";
import { Table, type TableColumn } from "../../components/ui/Table";
import { useAuth } from "../../hooks/useAuth";
import { useFleetData } from "../../hooks/useFleetData";
import {
  operationsViewService,
  type WorkOrderOperationalView,
} from "../../services/operationsViewService";
import { formatDate } from "../../utils/formatDate";

export default function ServiceHistoryPage() {
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useFleetData();
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    if (!data || !user) return [];
    let history = operationsViewService.getServiceHistory(data);
    if (user.role === "mechanic") {
      const mechanicIds = new Set(
        operationsViewService
          .getWorkOrdersForMechanic(data, user.id)
          .map(({ workOrder }) => workOrder.id),
      );
      history = history.filter(({ workOrder }) =>
        mechanicIds.has(workOrder.id),
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
    const query = search.trim().toLowerCase();
    return history
      .filter(
        ({ mechanic, serviceType, vehicle }) =>
          !query ||
          serviceType.name.toLowerCase().includes(query) ||
          vehicle.fleetNumber.toLowerCase().includes(query) ||
          mechanic?.fullName.toLowerCase().includes(query),
      )
      .sort((left, right) =>
        (right.workOrder.completedDate ?? "").localeCompare(
          left.workOrder.completedDate ?? "",
        ),
      );
  }, [data, search, user]);

  const columns: Array<TableColumn<WorkOrderOperationalView>> = [
    {
      header: "Service",
      key: "service",
      render: ({ serviceType, vehicle }) => (
        <div className="primary-cell">
          <strong>{serviceType.name}</strong>
          <span>
            {vehicle.fleetNumber} · {vehicle.plate}
          </span>
        </div>
      ),
    },
    {
      header: "Completed",
      key: "completed",
      render: ({ workOrder }) =>
        workOrder.completedDate ? formatDate(workOrder.completedDate) : "—",
    },
    {
      header: "Mechanic",
      key: "mechanic",
      render: ({ mechanic }) => mechanic?.fullName ?? "Historical account",
    },
    {
      header: "Service notes",
      key: "notes",
      render: ({ workOrder }) => workOrder.serviceNotes || "No service notes",
    },
  ];

  return (
    <ManagementPage
      breadcrumb="Service history"
      controls={
        <SearchInput
          id="service-history-search"
          label="Search service history"
          onChange={setSearch}
          placeholder="Search service, vehicle, or mechanic"
          value={search}
        />
      }
      description="Completed work orders form one authoritative, read-only service history."
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
          emptyDescription="Completed work appropriate to your current account will appear here."
          emptyTitle="No completed service"
          getRowKey={({ workOrder }) => workOrder.id}
          rows={rows}
        />
      )}
    </ManagementPage>
  );
}
