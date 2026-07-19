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
import { Pagination } from "../../components/ui/Pagination";
import { SearchInput } from "../../components/ui/SearchInput";
import { Select } from "../../components/ui/Select";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Table, type TableColumn } from "../../components/ui/Table";
import { useAuth } from "../../hooks/useAuth";
import { useFleetData } from "../../hooks/useFleetData";
import { fleetDataService } from "../../services/fleetDataService";
import { managementViewService } from "../../services/managementViewService";
import type { UserRole } from "../../types/auth";
import type {
  UserAccountInput,
  UserManagementRecord,
} from "../../types/management";
import { formatRole } from "../../utils/roleRoutes";

const PAGE_SIZE = 5;

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { data, error, isLoading, reload } = useFleetData();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRole | "all">("all");
  const [status, setStatus] = useState<"Active" | "Inactive" | "all">("all");
  const [sort, setSort] = useState("name-asc");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<UserManagementRecord | null>(null);
  const [viewing, setViewing] = useState<UserManagementRecord | null>(null);
  const [deactivating, setDeactivating] = useState<UserManagementRecord | null>(
    null,
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);

  const records = useMemo(() => {
    if (!data) return [];
    const query = search.trim().toLowerCase();
    return managementViewService
      .getUsers(data)
      .filter(
        (record) =>
          (!query ||
            record.user.fullName.toLowerCase().includes(query) ||
            record.user.email.toLowerCase().includes(query) ||
            record.profileDetail.toLowerCase().includes(query)) &&
          (role === "all" || record.user.role === role) &&
          (status === "all" || record.user.status === status),
      )
      .sort((left, right) => {
        if (sort === "name-desc") {
          return right.user.fullName.localeCompare(left.user.fullName);
        }
        if (sort === "role") {
          return left.user.role.localeCompare(right.user.role);
        }
        return left.user.fullName.localeCompare(right.user.fullName);
      });
  }, [data, role, search, sort, status]);

  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = records.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const activeFilters = [
    search.trim() ? `Search: “${search.trim()}”` : "",
    role !== "all" ? `Role: ${role}` : "",
    status !== "all" ? `Status: ${status}` : "",
  ].filter(Boolean);

  const columns: Array<TableColumn<UserManagementRecord>> = [
    {
      header: "User",
      key: "user",
      render: (record) => (
        <div className="primary-cell">
          <strong>{record.user.fullName}</strong>
          <span>{record.user.email}</span>
        </div>
      ),
    },
    {
      header: "Role",
      key: "role",
      render: (record) => formatRole(record.user.role),
    },
    {
      header: "Profile",
      key: "profile",
      render: (record) => record.profileDetail,
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

  const getInitialValues = (): AccountFormValues | null => {
    if (!editing || !data) return null;
    const user = editing.user;
    return {
      depot: data.managerProfiles.find((profile) => profile.userId === user.id)
        ?.depot,
      email: user.email,
      employeeNumber:
        data.driverProfiles.find((profile) => profile.userId === user.id)
          ?.employeeNumber ??
        data.mechanicProfiles.find((profile) => profile.userId === user.id)
          ?.employeeNumber,
      fullName: user.fullName,
      id: user.id,
      licenseNumber: data.driverProfiles.find(
        (profile) => profile.userId === user.id,
      )?.licenseNumber,
      role: user.role,
      specialization: data.mechanicProfiles.find(
        (profile) => profile.userId === user.id,
      )?.specialization,
    };
  };

  const saveAccount = async (values: UserAccountInput) => {
    if (!currentUser) return;
    if (editing) {
      await fleetDataService.updateUser(
        editing.user.id,
        values,
        currentUser.id,
      );
      setFeedback({ message: "User account updated.", tone: "success" });
    } else {
      await fleetDataService.createUser(values, currentUser.id);
      setFeedback({
        message: "User account and role profile created.",
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
      await fleetDataService.deactivateUser(
        deactivating.user.id,
        currentUser.id,
      );
      setFeedback({ message: "User account deactivated.", tone: "success" });
      setDeactivating(null);
      await reload();
    } catch (deactivationError) {
      setFeedback({
        message:
          deactivationError instanceof Error
            ? deactivationError.message
            : "The account could not be deactivated.",
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
        addLabel="Add user"
        breadcrumb="Users"
        controls={
          <>
            <SearchInput
              id="user-search"
              label="Search users"
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search name, email, or profile"
              value={search}
            />
            <label className="toolbar-field">
              <span>Role</span>
              <Select
                onChange={(event) => {
                  setRole(event.target.value as UserRole | "all");
                  setPage(1);
                }}
                value={role}
              >
                <option value="all">All roles</option>
                <option value="admin">Administrator</option>
                <option value="manager">Manager</option>
                <option value="mechanic">Mechanic</option>
                <option value="driver">Driver</option>
              </Select>
            </label>
            <label className="toolbar-field">
              <span>Status</span>
              <Select
                onChange={(event) => {
                  setStatus(event.target.value as typeof status);
                  setPage(1);
                }}
                value={status}
              >
                <option value="all">All statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
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
                <option value="role">Role</option>
              </Select>
            </label>
            <ActiveFilters
              filters={activeFilters}
              onClear={() => {
                setSearch("");
                setRole("all");
                setStatus("all");
                setPage(1);
              }}
            />
          </>
        }
        description="Create and maintain user accounts while preserving linked operational history."
        feedback={feedback}
        onAdd={() => {
          setEditing(null);
          setIsFormOpen(true);
        }}
        title="User management"
      >
        {isLoading ? (
          <ManagementLoadingState label="Loading user accounts" />
        ) : error ? (
          <ErrorState
            description={error}
            onRetry={reload}
            title="Users could not be loaded"
          />
        ) : (
          <>
            <Table
              caption="ForgeFleet user accounts"
              columns={columns}
              emptyDescription="Adjust the search or filters, or add a user account."
              emptyTitle="No matching users"
              getRowKey={(record) => record.user.id}
              rows={pageRows}
            />
            {totalPages > 1 && (
              <Pagination
                currentPage={safePage}
                label="User account pages"
                onPageChange={setPage}
                totalPages={totalPages}
              />
            )}
          </>
        )}
      </ManagementPage>

      {isFormOpen && (
        <AccountFormModal
          initialValues={getInitialValues()}
          isOpen
          onClose={() => {
            setIsFormOpen(false);
            setEditing(null);
          }}
          onSubmit={saveAccount}
        />
      )}
      <RecordDetailsModal
        details={
          viewing
            ? [
                { label: "Full name", value: viewing.user.fullName },
                { label: "Email", value: viewing.user.email },
                { label: "Role", value: formatRole(viewing.user.role) },
                { label: "Profile", value: viewing.profileDetail },
                { label: "Status", value: viewing.user.status },
              ]
            : []
        }
        isOpen={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title="User account"
      />
      <ConfirmDialog
        confirmLabel="Deactivate account"
        description="ForgeFleet will first check active assignments and open maintenance work. Historical records will be preserved."
        isConfirming={isDeactivating}
        isOpen={Boolean(deactivating)}
        onCancel={() => setDeactivating(null)}
        onConfirm={confirmDeactivation}
        title={`Deactivate ${deactivating?.user.fullName ?? "account"}?`}
        tone="danger"
      />
    </>
  );
}
