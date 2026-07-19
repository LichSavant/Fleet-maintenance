import { useMemo, useState } from "react";

import { ActiveFilters } from "../../components/common/ActiveFilters";
import {
  AccountFormModal,
  type AccountFormValues,
} from "../../components/common/AccountFormModal";
import { ErrorState } from "../../components/common/ErrorState";
import { ManagementLoadingState } from "../../components/common/ManagementLoadingState";
import { ManagementPage } from "../../components/common/ManagementPage";
import { RecordActions } from "../../components/common/RecordActions";
import { RecordDetailsModal } from "../../components/common/RecordDetailsModal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { SearchInput } from "../../components/ui/SearchInput";
import { Select } from "../../components/ui/Select";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Table, type TableColumn } from "../../components/ui/Table";
import { useAuth } from "../../hooks/useAuth";
import { useFleetData } from "../../hooks/useFleetData";
import { fleetDataService } from "../../services/fleetDataService";
import { managementViewService } from "../../services/managementViewService";
import { recordFilterService } from "../../services/recordFilterService";
import type {
  MechanicManagementRecord,
  UserAccountInput,
} from "../../types/management";

export default function MechanicsPage() {
  const { user: currentUser } = useAuth();
  const { data, error, isLoading, reload } = useFleetData();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive" | "all">("all");
  const [work, setWork] = useState<"open" | "clear" | "all">("all");
  const [sort, setSort] = useState("name-asc");
  const [editing, setEditing] = useState<MechanicManagementRecord | null>(null);
  const [viewing, setViewing] = useState<MechanicManagementRecord | null>(null);
  const [deactivating, setDeactivating] =
    useState<MechanicManagementRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);

  const records = useMemo(() => {
    if (!data) return [];
    return recordFilterService
      .filterMechanics(managementViewService.getMechanics(data), {
        search,
        status,
        work,
      })
      .sort((left, right) => {
        if (sort === "name-desc")
          return right.user.fullName.localeCompare(left.user.fullName);
        if (sort === "work") return right.openWork - left.openWork;
        return left.user.fullName.localeCompare(right.user.fullName);
      });
  }, [data, search, sort, status, work]);

  const activeFilters = [
    search.trim() ? `Search: “${search.trim()}”` : "",
    status !== "all" ? `Status: ${status}` : "",
    work !== "all" ? `Workload: ${work}` : "",
  ].filter(Boolean);

  const columns: Array<TableColumn<MechanicManagementRecord>> = [
    {
      header: "Mechanic",
      key: "mechanic",
      render: (record) => (
        <div className="primary-cell">
          <strong>{record.user.fullName}</strong>
          <span>{record.user.email}</span>
        </div>
      ),
    },
    {
      header: "Employee number",
      key: "employee-number",
      render: (record) => record.profile.employeeNumber,
    },
    {
      header: "Specialty",
      key: "specialization",
      render: (record) => record.profile.specialization,
    },
    {
      header: "Open work",
      key: "open-work",
      render: (record) => record.openWork,
    },
    {
      header: "Completed",
      key: "completed",
      render: (record) => record.completedWork,
    },
    {
      header: "Status",
      key: "status",
      render: (record) => (
        <StatusBadge
          tone={record.user.status === "Active" ? "success" : "neutral"}
        >
          {record.user.status}
        </StatusBadge>
      ),
    },
    {
      align: "right",
      header: "Actions",
      key: "actions",
      render: (record) => (
        <RecordActions
          deactivateDisabled={record.user.status === "Inactive"}
          onDeactivate={() => setDeactivating(record)}
          onEdit={() => {
            setEditing(record);
            setIsFormOpen(true);
          }}
          onView={() => setViewing(record)}
        />
      ),
    },
  ];

  const initialValues: AccountFormValues | null = editing
    ? {
        email: editing.user.email,
        employeeNumber: editing.profile.employeeNumber,
        fullName: editing.user.fullName,
        id: editing.user.id,
        role: "mechanic",
        specialization: editing.profile.specialization,
      }
    : null;

  const saveMechanic = async (values: UserAccountInput) => {
    if (!currentUser) return;
    if (editing) {
      await fleetDataService.updateUser(
        editing.user.id,
        values,
        currentUser.id,
      );
      setFeedback({ message: "Mechanic account updated.", tone: "success" });
    } else {
      await fleetDataService.createMechanic(
        {
          email: values.email,
          employeeNumber: values.employeeNumber,
          fullName: values.fullName,
          specialization: values.specialization ?? "",
        },
        currentUser.id,
      );
      setFeedback({
        message: "Mechanic account and profile created.",
        tone: "success",
      });
    }
    setIsFormOpen(false);
    setEditing(null);
    await reload();
  };

  const confirmDeactivation = async () => {
    if (!deactivating || !currentUser) return;
    setIsDeactivating(true);
    try {
      await fleetDataService.deactivateMechanic(
        deactivating.profile.id,
        currentUser.id,
      );
      setFeedback({
        message: "Mechanic account deactivated.",
        tone: "success",
      });
      setDeactivating(null);
      await reload();
    } catch (deactivationError) {
      setFeedback({
        message:
          deactivationError instanceof Error
            ? deactivationError.message
            : "The mechanic could not be deactivated.",
        tone: "error",
      });
      setDeactivating(null);
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <>
      <ManagementPage
        addLabel="Add mechanic"
        breadcrumb="Mechanics"
        controls={
          <>
            <SearchInput
              id="mechanic-search"
              label="Search mechanics"
              onChange={setSearch}
              placeholder="Search mechanic, employee, or specialization"
              value={search}
            />
            <label className="toolbar-field">
              <span>Status</span>
              <Select
                onChange={(event) =>
                  setStatus(event.target.value as typeof status)
                }
                value={status}
              >
                <option value="all">All statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Select>
            </label>
            <label className="toolbar-field">
              <span>Workload</span>
              <Select
                onChange={(event) => setWork(event.target.value as typeof work)}
                value={work}
              >
                <option value="all">All workloads</option>
                <option value="open">Has open work</option>
                <option value="clear">No open work</option>
              </Select>
            </label>
            <label className="toolbar-field">
              <span>Sort</span>
              <Select
                onChange={(event) => setSort(event.target.value)}
                value={sort}
              >
                <option value="name-asc">Name A–Z</option>
                <option value="name-desc">Name Z–A</option>
                <option value="work">Open work</option>
              </Select>
            </label>
            <ActiveFilters
              filters={activeFilters}
              onClear={() => {
                setSearch("");
                setStatus("all");
                setWork("all");
              }}
            />
          </>
        }
        description="Maintain mechanic accounts, specialties, workload visibility, and service-history relationships."
        feedback={feedback}
        onAdd={() => {
          setEditing(null);
          setIsFormOpen(true);
        }}
        title="Mechanic management"
      >
        {isLoading ? (
          <ManagementLoadingState label="Loading mechanic records" />
        ) : error ? (
          <ErrorState
            description={error}
            onRetry={reload}
            title="Mechanics could not be loaded"
          />
        ) : (
          <Table
            caption="ForgeFleet mechanic accounts"
            columns={columns}
            emptyDescription="Adjust the search or filters, or add a mechanic account."
            emptyTitle="No matching mechanics"
            getRowKey={(record) => record.profile.id}
            rows={records}
          />
        )}
      </ManagementPage>

      {isFormOpen && (
        <AccountFormModal
          fixedRole="mechanic"
          initialValues={initialValues}
          isOpen
          onClose={() => {
            setIsFormOpen(false);
            setEditing(null);
          }}
          onSubmit={saveMechanic}
        />
      )}
      <RecordDetailsModal
        details={
          viewing
            ? [
                { label: "Mechanic", value: viewing.user.fullName },
                { label: "Email", value: viewing.user.email },
                {
                  label: "Employee number",
                  value: viewing.profile.employeeNumber,
                },
                {
                  label: "Specialty",
                  value: viewing.profile.specialization,
                },
                { label: "Open work", value: viewing.openWork },
                { label: "Completed service", value: viewing.completedWork },
                { label: "Account status", value: viewing.user.status },
              ]
            : []
        }
        isOpen={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title="Mechanic record"
      />
      <ConfirmDialog
        confirmLabel="Deactivate mechanic"
        description="Planned or open maintenance work prevents deactivation. Completed service history remains linked to this account."
        isConfirming={isDeactivating}
        isOpen={Boolean(deactivating)}
        onCancel={() => setDeactivating(null)}
        onConfirm={confirmDeactivation}
        title={`Deactivate ${deactivating?.user.fullName ?? "mechanic"}?`}
        tone="danger"
      />
    </>
  );
}
