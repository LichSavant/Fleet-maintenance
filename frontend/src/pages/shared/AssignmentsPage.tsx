import { useMemo, useState } from "react";

import { AssignmentFormModal } from "../../components/common/AssignmentFormModal";
import { ErrorState } from "../../components/common/ErrorState";
import { ManagementLoadingState } from "../../components/common/ManagementLoadingState";
import { ManagementPage } from "../../components/common/ManagementPage";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { SearchInput } from "../../components/ui/SearchInput";
import { Select } from "../../components/ui/Select";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Table, type TableColumn } from "../../components/ui/Table";
import { useFleetData } from "../../hooks/useFleetData";
import { useAuth } from "../../hooks/useAuth";
import { fleetDataService } from "../../services/fleetDataService";
import {
  operationsViewService,
  type AssignmentOperationalView,
} from "../../services/operationsViewService";
import type { AssignmentStatus } from "../../types/fleet";
import { formatDate } from "../../utils/formatDate";
import { getStatusTone } from "../../utils/statusTone";

export default function AssignmentsPage() {
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useFleetData();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AssignmentStatus | "all">("Active");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [ending, setEnding] = useState<AssignmentOperationalView | null>(null);
  const [isEnding, setIsEnding] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);

  const rows = useMemo(() => {
    if (!data) return [];
    const query = search.trim().toLowerCase();
    return operationsViewService
      .getAssignments(data)
      .filter(
        ({ assignment, driver, vehicle }) =>
          (status === "all" || assignment.status === status) &&
          (!query ||
            driver.fullName.toLowerCase().includes(query) ||
            vehicle.fleetNumber.toLowerCase().includes(query) ||
            vehicle.plateNumber.toLowerCase().includes(query)),
      )
      .sort((left, right) =>
        right.assignment.startDate.localeCompare(left.assignment.startDate),
      );
  }, [data, search, status]);

  const columns: Array<TableColumn<AssignmentOperationalView>> = [
    {
      header: "Vehicle",
      key: "vehicle",
      render: ({ vehicle }) => (
        <div className="primary-cell">
          <strong>{vehicle.fleetNumber}</strong>
          <span>{vehicle.plateNumber}</span>
        </div>
      ),
    },
    {
      header: "Driver",
      key: "driver",
      render: ({ driver }) => driver.fullName,
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
    {
      align: "right",
      header: "Actions",
      key: "actions",
      render: (record) =>
        record.assignment.status === "Active" ? (
          <Button
            onClick={() => setEnding(record)}
            size="small"
            variant="danger"
          >
            End assignment
          </Button>
        ) : (
          <span className="table-muted">Historical</span>
        ),
    },
  ];

  const endAssignment = async () => {
    if (!ending || !user) return;
    setIsEnding(true);
    try {
      await fleetDataService.endAssignment(
        ending.assignment.id,
        new Date().toISOString().slice(0, 10),
        user.id,
      );
      setFeedback({
        message: "Assignment ended and the driver is available again.",
        tone: "success",
      });
      setEnding(null);
      await reload();
    } catch (endError) {
      setFeedback({
        message:
          endError instanceof Error
            ? endError.message
            : "The assignment could not be ended.",
        tone: "error",
      });
      setEnding(null);
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <>
      <ManagementPage
        addLabel="Create assignment"
        breadcrumb="Assignments"
        controls={
          <>
            <SearchInput
              id="assignment-search"
              label="Search assignments"
              onChange={setSearch}
              placeholder="Search driver, fleet number, or plate"
              value={search}
            />
            <label className="toolbar-field">
              <span>Status</span>
              <Select
                onChange={(event) =>
                  setStatus(event.target.value as AssignmentStatus | "all")
                }
                value={status}
              >
                <option value="all">All assignments</option>
                <option value="Active">Active</option>
                <option value="Ended">Historical</option>
              </Select>
            </label>
          </>
        }
        description="Assign eligible drivers to available vehicles without overlapping active relationships."
        feedback={feedback}
        onAdd={() => setIsFormOpen(true)}
        title="Vehicle assignments"
      >
        {isLoading ? (
          <ManagementLoadingState label="Loading assignments" />
        ) : error ? (
          <ErrorState
            description={error}
            onRetry={reload}
            title="Assignments could not be loaded"
          />
        ) : (
          <Table
            caption="Vehicle assignments"
            columns={columns}
            emptyDescription="Adjust the search or status filter, or create an eligible assignment."
            emptyTitle="No matching assignments"
            getRowKey={({ assignment }) => assignment.id}
            rows={rows}
          />
        )}
      </ManagementPage>
      {data && isFormOpen && (
        <AssignmentFormModal
          data={data}
          isOpen
          onClose={() => setIsFormOpen(false)}
          onSubmit={async (input) => {
            if (!user) return;
            await fleetDataService.createAssignment(input, user.id);
            setFeedback({
              message: "Vehicle assignment created.",
              tone: "success",
            });
            setIsFormOpen(false);
            await reload();
          }}
        />
      )}
      <ConfirmDialog
        confirmLabel="End assignment"
        description="The historical assignment will remain visible and the linked driver will become available."
        isConfirming={isEnding}
        isOpen={Boolean(ending)}
        onCancel={() => setEnding(null)}
        onConfirm={endAssignment}
        title={`End assignment for ${ending?.driver.fullName ?? "driver"}?`}
        tone="danger"
      />
    </>
  );
}
