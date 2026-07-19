import { useMemo, useState } from "react";

import { ErrorState } from "../../components/common/ErrorState";
import { ManagementLoadingState } from "../../components/common/ManagementLoadingState";
import { ManagementPage } from "../../components/common/ManagementPage";
import { ScheduleFormModal } from "../../components/common/ScheduleFormModal";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { SearchInput } from "../../components/ui/SearchInput";
import { Select } from "../../components/ui/Select";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Table, type TableColumn } from "../../components/ui/Table";
import { useAuth } from "../../hooks/useAuth";
import { useFleetData } from "../../hooks/useFleetData";
import { fleetDataService } from "../../services/fleetDataService";
import {
  operationsViewService,
  type ScheduleOperationalView,
} from "../../services/operationsViewService";
import type { ScheduleStatus } from "../../types/fleet";
import { formatDate } from "../../utils/formatDate";
import { getStatusTone } from "../../utils/statusTone";

export default function MaintenanceSchedulesPage() {
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useFleetData();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ScheduleStatus | "all">("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [cancelling, setCancelling] = useState<ScheduleOperationalView | null>(
    null,
  );
  const [isCancelling, setIsCancelling] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);

  const rows = useMemo(() => {
    if (!data) return [];
    const query = search.trim().toLowerCase();
    return operationsViewService
      .getSchedules(data)
      .filter(
        ({ mechanic, schedule, serviceType, vehicle }) =>
          (status === "all" || schedule.status === status) &&
          (!query ||
            vehicle.fleetNumber.toLowerCase().includes(query) ||
            serviceType.name.toLowerCase().includes(query) ||
            mechanic?.fullName.toLowerCase().includes(query)),
      )
      .sort((left, right) =>
        left.schedule.dueDate.localeCompare(right.schedule.dueDate),
      );
  }, [data, search, status]);

  const columns: Array<TableColumn<ScheduleOperationalView>> = [
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
      header: "Scheduled date",
      key: "date",
      render: ({ schedule }) => formatDate(schedule.dueDate),
    },
    {
      header: "Preferred mechanic",
      key: "mechanic",
      render: ({ mechanic }) => mechanic?.fullName ?? "Assign later",
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
    {
      header: "Work order",
      key: "work-order",
      render: ({ schedule }) =>
        schedule.workOrderId ? "Linked" : "Not created",
    },
    {
      align: "right",
      header: "Actions",
      key: "actions",
      render: (record) =>
        record.schedule.status === "Upcoming" ||
        record.schedule.status === "Overdue" ? (
          <Button
            onClick={() => setCancelling(record)}
            size="small"
            variant="danger"
          >
            Cancel
          </Button>
        ) : (
          <span className="table-muted">No action</span>
        ),
    },
  ];

  const cancelSchedule = async () => {
    if (!cancelling || !user) return;
    setIsCancelling(true);
    try {
      await fleetDataService.cancelMaintenanceSchedule(
        cancelling.schedule.id,
        user.id,
      );
      setFeedback({
        message: "Maintenance schedule cancelled.",
        tone: "success",
      });
      setCancelling(null);
      await reload();
    } catch (cancelError) {
      setFeedback({
        message:
          cancelError instanceof Error
            ? cancelError.message
            : "The schedule could not be cancelled.",
        tone: "error",
      });
      setCancelling(null);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <>
      <ManagementPage
        addLabel="Create schedule"
        breadcrumb="Maintenance schedules"
        controls={
          <>
            <SearchInput
              id="schedule-search"
              label="Search maintenance schedules"
              onChange={setSearch}
              placeholder="Search service, vehicle, or mechanic"
              value={search}
            />
            <label className="toolbar-field">
              <span>Status</span>
              <Select
                onChange={(event) =>
                  setStatus(event.target.value as ScheduleStatus | "all")
                }
                value={status}
              >
                <option value="all">All statuses</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Overdue">Overdue</option>
                <option value="Converted">Converted</option>
                <option value="Cancelled">Cancelled</option>
              </Select>
            </label>
          </>
        }
        description="Plan future vehicle service separately from work execution and completed history."
        feedback={feedback}
        onAdd={() => setIsFormOpen(true)}
        title="Maintenance schedules"
      >
        {isLoading ? (
          <ManagementLoadingState label="Loading maintenance schedules" />
        ) : error ? (
          <ErrorState
            description={error}
            onRetry={reload}
            title="Schedules could not be loaded"
          />
        ) : (
          <Table
            caption="Maintenance schedules"
            columns={columns}
            emptyDescription="Adjust the search or status filter, or create a maintenance schedule."
            emptyTitle="No matching schedules"
            getRowKey={({ schedule }) => schedule.id}
            rows={rows}
          />
        )}
      </ManagementPage>
      {data && isFormOpen && (
        <ScheduleFormModal
          data={data}
          isOpen
          onClose={() => setIsFormOpen(false)}
          onSubmit={async (input) => {
            if (!user) return;
            await fleetDataService.createMaintenanceSchedule(input, user.id);
            setFeedback({
              message: "Maintenance schedule created.",
              tone: "success",
            });
            setIsFormOpen(false);
            await reload();
          }}
        />
      )}
      <ConfirmDialog
        confirmLabel="Cancel schedule"
        description="Cancelled schedules remain visible for operational history. A linked work order must be handled in the work-order workflow."
        isConfirming={isCancelling}
        isOpen={Boolean(cancelling)}
        onCancel={() => setCancelling(null)}
        onConfirm={cancelSchedule}
        title="Cancel maintenance schedule?"
        tone="danger"
      />
    </>
  );
}
