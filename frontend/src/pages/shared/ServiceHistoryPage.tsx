import { useMemo, useState } from "react";

import { ErrorState } from "../../components/common/ErrorState";
import { HistoryCorrectionModal } from "../../components/common/HistoryCorrectionModal";
import { ManagementLoadingState } from "../../components/common/ManagementLoadingState";
import { ManagementPage } from "../../components/common/ManagementPage";
import { SearchInput } from "../../components/ui/SearchInput";
import { Button } from "../../components/ui/Button";
import { Table, type TableColumn } from "../../components/ui/Table";
import { useAuth } from "../../hooks/useAuth";
import { useFleetData } from "../../hooks/useFleetData";
import {
  operationsViewService,
  type ServiceHistoryOperationalView,
} from "../../services/operationsViewService";
import { fleetDataService } from "../../services/fleetDataService";
import { formatDate } from "../../utils/formatDate";

export default function ServiceHistoryPage() {
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useFleetData();
  const [search, setSearch] = useState("");
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
        right.history.serviceDate.localeCompare(left.history.serviceDate),
      );
  }, [data, search, user]);

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
        <SearchInput
          id="service-history-search"
          label="Search service history"
          onChange={setSearch}
          placeholder="Search service, vehicle, or mechanic"
          value={search}
        />
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
          emptyDescription="Completed work appropriate to your current account will appear here."
          emptyTitle="No completed service"
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
