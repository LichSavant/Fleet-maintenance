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
import type { DriverStatus } from "../../types/fleet";
import type {
  DriverManagementRecord,
  UserAccountInput,
} from "../../types/management";

export default function DriversPage() {
  const { user: currentUser } = useAuth();
  const { data, error, isLoading, reload } = useFleetData();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DriverStatus | "all">("all");
  const [assignment, setAssignment] = useState<
    "assigned" | "available" | "all"
  >("all");
  const [sort, setSort] = useState("name-asc");
  const [editing, setEditing] = useState<DriverManagementRecord | null>(null);
  const [viewing, setViewing] = useState<DriverManagementRecord | null>(null);
  const [deactivating, setDeactivating] =
    useState<DriverManagementRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);

  const records = useMemo(() => {
    if (!data) return [];
    return recordFilterService
      .filterDrivers(managementViewService.getDrivers(data), {
        assignment,
        search,
        status,
      })
      .sort((left, right) => {
        if (sort === "name-desc")
          return right.user.fullName.localeCompare(left.user.fullName);
        if (sort === "license") {
          return left.profile.licenseNumber.localeCompare(
            right.profile.licenseNumber,
          );
        }
        return left.user.fullName.localeCompare(right.user.fullName);
      });
  }, [assignment, data, search, sort, status]);

  const activeFilters = [
    search.trim() ? `Search: “${search.trim()}”` : "",
    status !== "all" ? `Status: ${status}` : "",
    assignment !== "all" ? `Assignment: ${assignment}` : "",
  ].filter(Boolean);

  const columns: Array<TableColumn<DriverManagementRecord>> = [
    {
      header: "Driver",
      key: "driver",
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
      header: "License",
      key: "license",
      render: (record) => record.profile.licenseNumber,
    },
    {
      header: "Assigned vehicle",
      key: "vehicle",
      render: (record) =>
        record.assignedVehicle
          ? `${record.assignedVehicle.fleetNumber} · ${record.assignedVehicle.plateNumber}`
          : "Not assigned",
    },
    {
      header: "Status",
      key: "status",
      render: (record) => (
        <StatusBadge
          tone={
            record.user.status === "Inactive"
              ? "neutral"
              : record.activeAssignment
                ? "success"
                : "info"
          }
        >
          {record.user.status === "Inactive"
            ? "Inactive"
            : record.profile.status}
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
        licenseNumber: editing.profile.licenseNumber,
        role: "driver",
      }
    : null;

  const saveDriver = async (values: UserAccountInput) => {
    if (!currentUser) return;
    if (editing) {
      await fleetDataService.updateUser(
        editing.user.id,
        values,
        currentUser.id,
      );
      setFeedback({ message: "Driver account updated.", tone: "success" });
    } else {
      await fleetDataService.createDriver(
        {
          email: values.email,
          employeeNumber: values.employeeNumber,
          fullName: values.fullName,
          licenseNumber: values.licenseNumber ?? "",
        },
        currentUser.id,
      );
      setFeedback({
        message: "Driver account and profile created.",
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
      await fleetDataService.deactivateDriver(
        deactivating.profile.id,
        currentUser.id,
      );
      setFeedback({ message: "Driver account deactivated.", tone: "success" });
      setDeactivating(null);
      await reload();
    } catch (deactivationError) {
      setFeedback({
        message:
          deactivationError instanceof Error
            ? deactivationError.message
            : "The driver could not be deactivated.",
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
        addLabel="Add driver"
        breadcrumb="Drivers"
        controls={
          <>
            <SearchInput
              id="driver-search"
              label="Search drivers"
              onChange={setSearch}
              placeholder="Search driver, employee, license, or vehicle"
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
                <option value="Assigned">Assigned</option>
                <option value="Available">Available</option>
                <option value="Inactive">Inactive</option>
              </Select>
            </label>
            <label className="toolbar-field">
              <span>Assignment</span>
              <Select
                onChange={(event) =>
                  setAssignment(event.target.value as typeof assignment)
                }
                value={assignment}
              >
                <option value="all">All assignments</option>
                <option value="assigned">Assigned</option>
                <option value="available">Available</option>
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
                <option value="license">License</option>
              </Select>
            </label>
            <ActiveFilters
              filters={activeFilters}
              onClear={() => {
                setSearch("");
                setStatus("all");
                setAssignment("all");
              }}
            />
          </>
        }
        description="Manage driver accounts, licenses, availability, and current vehicle relationships."
        feedback={feedback}
        onAdd={() => {
          setEditing(null);
          setIsFormOpen(true);
        }}
        title="Driver management"
      >
        {isLoading ? (
          <ManagementLoadingState label="Loading driver records" />
        ) : error ? (
          <ErrorState
            description={error}
            onRetry={reload}
            title="Drivers could not be loaded"
          />
        ) : (
          <Table
            caption="ForgeFleet driver accounts"
            columns={columns}
            emptyDescription="Adjust the search or filters, or add a driver account."
            emptyTitle="No matching drivers"
            getRowKey={(record) => record.profile.id}
            rows={records}
          />
        )}
      </ManagementPage>

      {isFormOpen && (
        <AccountFormModal
          fixedRole="driver"
          initialValues={initialValues}
          isOpen
          onClose={() => {
            setIsFormOpen(false);
            setEditing(null);
          }}
          onSubmit={saveDriver}
        />
      )}
      <RecordDetailsModal
        details={
          viewing
            ? [
                { label: "Driver", value: viewing.user.fullName },
                { label: "Email", value: viewing.user.email },
                { label: "License", value: viewing.profile.licenseNumber },
                {
                  label: "Employee number",
                  value: viewing.profile.employeeNumber,
                },
                {
                  label: "Assigned vehicle",
                  value: viewing.assignedVehicle
                    ? `${viewing.assignedVehicle.fleetNumber} · ${viewing.assignedVehicle.plateNumber}`
                    : "Not assigned",
                },
                { label: "Account status", value: viewing.user.status },
              ]
            : []
        }
        isOpen={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title="Driver record"
      />
      <ConfirmDialog
        confirmLabel="Deactivate driver"
        description="An active vehicle assignment prevents deactivation. Historical assignments and mileage records remain available."
        isConfirming={isDeactivating}
        isOpen={Boolean(deactivating)}
        onCancel={() => setDeactivating(null)}
        onConfirm={confirmDeactivation}
        title={`Deactivate ${deactivating?.user.fullName ?? "driver"}?`}
        tone="danger"
      />
    </>
  );
}
