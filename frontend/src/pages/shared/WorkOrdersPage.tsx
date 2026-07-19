import { useMemo, useState } from "react";

import { AssignMechanicModal } from "../../components/common/AssignMechanicModal";
import { ErrorState } from "../../components/common/ErrorState";
import { ManagementLoadingState } from "../../components/common/ManagementLoadingState";
import { ManagementPage } from "../../components/common/ManagementPage";
import { RecordDetailsModal } from "../../components/common/RecordDetailsModal";
import { ServiceNotesModal } from "../../components/common/ServiceNotesModal";
import { WorkOrderFormModal } from "../../components/common/WorkOrderFormModal";
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
  type WorkOrderOperationalView,
} from "../../services/operationsViewService";
import type { WorkOrderStatus } from "../../types/fleet";
import { formatDate } from "../../utils/formatDate";
import { formatStatus } from "../../utils/formatStatus";
import { getStatusTone } from "../../utils/statusTone";

type NotesAction = {
  mode: "complete" | "notes";
  record: WorkOrderOperationalView;
};

export default function WorkOrdersPage() {
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useFleetData();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<WorkOrderStatus | "all">("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewing, setViewing] = useState<WorkOrderOperationalView | null>(null);
  const [assigning, setAssigning] = useState<WorkOrderOperationalView | null>(
    null,
  );
  const [notesAction, setNotesAction] = useState<NotesAction | null>(null);
  const [cancelling, setCancelling] = useState<WorkOrderOperationalView | null>(
    null,
  );
  const [isCancelling, setIsCancelling] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);
  const canPlan = user?.role === "admin" || user?.role === "manager";

  const rows = useMemo(() => {
    if (!data || !user) return [];
    const source =
      user.role === "mechanic"
        ? operationsViewService.getWorkOrdersForMechanic(data, user.id)
        : operationsViewService.getWorkOrders(data);
    const query = search.trim().toLowerCase();
    return source
      .filter(
        ({ mechanic, serviceType, vehicle, workOrder }) =>
          (status === "all" || workOrder.status === status) &&
          (!query ||
            serviceType.name.toLowerCase().includes(query) ||
            vehicle.fleetNumber.toLowerCase().includes(query) ||
            mechanic?.fullName.toLowerCase().includes(query)),
      )
      .sort((left, right) =>
        right.workOrder.scheduledDate.localeCompare(
          left.workOrder.scheduledDate,
        ),
      );
  }, [data, search, status, user]);

  const startWork = async (record: WorkOrderOperationalView) => {
    if (!user) return;
    try {
      await fleetDataService.transitionWorkOrder(record.workOrder.id, {
        actorUserId: user.id,
        status: "in_progress",
      });
      setFeedback({
        message: "Work order started and the vehicle is now in maintenance.",
        tone: "success",
      });
      await reload();
    } catch (transitionError) {
      setFeedback({
        message:
          transitionError instanceof Error
            ? transitionError.message
            : "The work order could not be started.",
        tone: "error",
      });
    }
  };

  const columns: Array<TableColumn<WorkOrderOperationalView>> = [
    {
      header: "Work order",
      key: "work-order",
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
      header: "Scheduled",
      key: "date",
      render: ({ workOrder }) => formatDate(workOrder.scheduledDate),
    },
    {
      header: "Mechanic",
      key: "mechanic",
      render: ({ mechanic }) => mechanic?.fullName ?? "Unassigned",
    },
    {
      header: "Priority",
      key: "priority",
      render: ({ workOrder }) => (
        <StatusBadge tone={getStatusTone(workOrder.priority)}>
          {workOrder.priority}
        </StatusBadge>
      ),
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
    {
      align: "right",
      header: "Actions",
      key: "actions",
      render: (record) => (
        <div className="record-actions">
          <Button
            onClick={() => setViewing(record)}
            size="small"
            variant="ghost"
          >
            View
          </Button>
          {record.workOrder.status === "scheduled" && canPlan && (
            <Button onClick={() => setAssigning(record)} size="small">
              Assign
            </Button>
          )}
          {record.workOrder.status === "assigned" &&
            (user?.role === "mechanic" || user?.role === "admin") && (
              <Button
                onClick={() => void startWork(record)}
                size="small"
                variant="primary"
              >
                Start
              </Button>
            )}
          {record.workOrder.status === "in_progress" &&
            (user?.role === "mechanic" || user?.role === "admin") && (
              <>
                <Button
                  onClick={() => setNotesAction({ mode: "notes", record })}
                  size="small"
                >
                  Notes
                </Button>
                <Button
                  onClick={() => setNotesAction({ mode: "complete", record })}
                  size="small"
                  variant="primary"
                >
                  Complete
                </Button>
              </>
            )}
          {(record.workOrder.status === "scheduled" ||
            record.workOrder.status === "assigned") &&
            canPlan && (
              <Button
                onClick={() => setCancelling(record)}
                size="small"
                variant="danger"
              >
                Cancel
              </Button>
            )}
        </div>
      ),
    },
  ];

  const cancelWork = async () => {
    if (!cancelling || !user) return;
    setIsCancelling(true);
    try {
      await fleetDataService.transitionWorkOrder(cancelling.workOrder.id, {
        actorUserId: user.id,
        status: "cancelled",
      });
      setFeedback({
        message: "Work order cancelled. Its record remains visible.",
        tone: "success",
      });
      setCancelling(null);
      await reload();
    } catch (cancelError) {
      setFeedback({
        message:
          cancelError instanceof Error
            ? cancelError.message
            : "The work order could not be cancelled.",
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
        addLabel={canPlan ? "Create work order" : undefined}
        breadcrumb="Work orders"
        controls={
          <>
            <SearchInput
              id="work-order-search"
              label="Search work orders"
              onChange={setSearch}
              placeholder="Search service, vehicle, or mechanic"
              value={search}
            />
            <label className="toolbar-field">
              <span>Status</span>
              <Select
                onChange={(event) =>
                  setStatus(event.target.value as WorkOrderStatus | "all")
                }
                value={status}
              >
                <option value="all">All statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </label>
          </>
        }
        description={
          user?.role === "mechanic"
            ? "Start, document, and complete work linked to your signed-in mechanic profile."
            : "Coordinate linked maintenance work through validated operational states."
        }
        feedback={feedback}
        onAdd={canPlan ? () => setIsFormOpen(true) : undefined}
        title={
          user?.role === "mechanic"
            ? "My maintenance work"
            : "Maintenance work orders"
        }
      >
        {isLoading ? (
          <ManagementLoadingState label="Loading work orders" />
        ) : error ? (
          <ErrorState
            description={error}
            onRetry={reload}
            title="Work orders could not be loaded"
          />
        ) : (
          <Table
            caption="Maintenance work orders"
            columns={columns}
            emptyDescription="No work orders match this view."
            emptyTitle="No work orders found"
            getRowKey={({ workOrder }) => workOrder.id}
            rows={rows}
          />
        )}
      </ManagementPage>
      {data && isFormOpen && (
        <WorkOrderFormModal
          data={data}
          isOpen
          onClose={() => setIsFormOpen(false)}
          onSubmit={async (input) => {
            if (!user) return;
            await fleetDataService.createWorkOrder(input, user.id);
            setFeedback({
              message: "Maintenance work order created.",
              tone: "success",
            });
            setIsFormOpen(false);
            await reload();
          }}
        />
      )}
      {data && assigning && (
        <AssignMechanicModal
          data={data}
          isOpen
          onClose={() => setAssigning(null)}
          onSubmit={async (assignedMechanicId) => {
            if (!user) return;
            await fleetDataService.assignWorkOrder(
              assigning.workOrder.id,
              assignedMechanicId,
              user.id,
            );
            setFeedback({
              message: "Mechanic assigned to work order.",
              tone: "success",
            });
            setAssigning(null);
            await reload();
          }}
        />
      )}
      {notesAction && (
        <ServiceNotesModal
          initialNotes={notesAction.record.workOrder.serviceNotes}
          isOpen
          mode={notesAction.mode}
          onClose={() => setNotesAction(null)}
          onSubmit={async (notes) => {
            if (!user) return;
            if (notesAction.mode === "complete") {
              await fleetDataService.transitionWorkOrder(
                notesAction.record.workOrder.id,
                {
                  actorUserId: user.id,
                  serviceNotes: notes,
                  status: "completed",
                },
              );
              setFeedback({
                message: "Work completed and added to service history.",
                tone: "success",
              });
            } else {
              await fleetDataService.updateWorkOrderServiceNotes(
                notesAction.record.workOrder.id,
                notes,
                user.id,
              );
              setFeedback({
                message: "Service notes updated.",
                tone: "success",
              });
            }
            setNotesAction(null);
            await reload();
          }}
        />
      )}
      <RecordDetailsModal
        details={
          viewing
            ? [
                { label: "Service", value: viewing.serviceType.name },
                {
                  label: "Vehicle",
                  value: `${viewing.vehicle.fleetNumber} · ${viewing.vehicle.model}`,
                },
                {
                  label: "Mechanic",
                  value: viewing.mechanic?.fullName ?? "Unassigned",
                },
                {
                  label: "Scheduled date",
                  value: formatDate(viewing.workOrder.scheduledDate),
                },
                {
                  label: "Status",
                  value: formatStatus(viewing.workOrder.status),
                },
                { label: "Priority", value: viewing.workOrder.priority },
                {
                  label: "Work instructions",
                  value: viewing.workOrder.notes || "No instructions",
                },
                {
                  label: "Service notes",
                  value: viewing.workOrder.serviceNotes || "No service notes",
                },
              ]
            : []
        }
        isOpen={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title="Work-order details"
      />
      <ConfirmDialog
        confirmLabel="Cancel work order"
        description="Cancellation is available only before work begins. The record remains visible for audit history."
        isConfirming={isCancelling}
        isOpen={Boolean(cancelling)}
        onCancel={() => setCancelling(null)}
        onConfirm={cancelWork}
        title="Cancel work order?"
        tone="danger"
      />
    </>
  );
}
