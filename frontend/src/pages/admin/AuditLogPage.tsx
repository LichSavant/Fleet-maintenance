import { useMemo, useState } from "react";

import { ActiveFilters } from "../../components/common/ActiveFilters";
import { ErrorState } from "../../components/common/ErrorState";
import { ManagementLoadingState } from "../../components/common/ManagementLoadingState";
import { ManagementPage } from "../../components/common/ManagementPage";
import { SearchInput } from "../../components/ui/SearchInput";
import { Select } from "../../components/ui/Select";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Table, type TableColumn } from "../../components/ui/Table";
import { useFleetData } from "../../hooks/useFleetData";
import {
  auditLogService,
  formatAuditEntityType,
} from "../../services/auditLogService";
import type { UserRole } from "../../types/auth";
import type { AuditEntityType, AuditEvent } from "../../types/fleet";
import { formatRole } from "../../utils/roleRoutes";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AuditLogPage() {
  const { data, error, isLoading, reload } = useFleetData();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRole | "all">("all");
  const [entityType, setEntityType] = useState<AuditEntityType | "all">("all");

  const records = useMemo(
    () =>
      data ? auditLogService.getEvents(data, { entityType, role, search }) : [],
    [data, entityType, role, search],
  );
  const entityTypes = data ? auditLogService.getEntityTypes(data) : [];
  const activeFilters = [
    search.trim() ? `Search: “${search.trim()}”` : "",
    role !== "all" ? `Role: ${formatRole(role)}` : "",
    entityType !== "all" ? `Entity: ${formatAuditEntityType(entityType)}` : "",
  ].filter(Boolean);

  const columns: Array<TableColumn<AuditEvent>> = [
    {
      header: "Timestamp",
      key: "timestamp",
      render: (event) => formatTimestamp(event.createdAt),
    },
    {
      header: "Actor",
      key: "actor",
      render: (event) => (
        <div className="primary-cell">
          <strong>{event.userDisplayName}</strong>
          <span>{event.userId}</span>
        </div>
      ),
    },
    {
      header: "Role",
      key: "role",
      render: (event) => (
        <StatusBadge tone="neutral">{formatRole(event.role)}</StatusBadge>
      ),
    },
    { header: "Action", key: "action", render: (event) => event.action },
    {
      header: "Entity",
      key: "entity",
      render: (event) => (
        <div className="primary-cell">
          <strong>{formatAuditEntityType(event.entityType)}</strong>
          <span>{event.entityId}</span>
        </div>
      ),
    },
    {
      header: "Description",
      key: "description",
      render: (event) => event.description,
    },
  ];

  return (
    <ManagementPage
      breadcrumb="Audit log"
      controls={
        <>
          <SearchInput
            id="audit-search"
            label="Search audit log"
            onChange={setSearch}
            placeholder="Search actor, action, entity, or description"
            value={search}
          />
          <label className="toolbar-field">
            <span>Role</span>
            <Select
              onChange={(event) =>
                setRole(event.target.value as UserRole | "all")
              }
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
            <span>Entity</span>
            <Select
              onChange={(event) =>
                setEntityType(event.target.value as AuditEntityType | "all")
              }
              value={entityType}
            >
              <option value="all">All entities</option>
              {entityTypes.map((type) => (
                <option key={type} value={type}>
                  {formatAuditEntityType(type)}
                </option>
              ))}
            </Select>
          </label>
          <ActiveFilters
            filters={activeFilters}
            onClear={() => {
              setEntityType("all");
              setRole("all");
              setSearch("");
            }}
          />
        </>
      }
      description="Frontend demonstration activity stored in this browser only. This is not secure server auditing."
      title="Audit log"
    >
      {isLoading ? (
        <ManagementLoadingState label="Loading audit events" />
      ) : error ? (
        <ErrorState
          description={error}
          onRetry={reload}
          title="Audit events could not be loaded"
        />
      ) : (
        <Table
          caption="Frontend demonstration audit events"
          columns={columns}
          emptyDescription="Adjust the search or filters. New frontend actions will appear here."
          emptyTitle="No matching audit events"
          getRowKey={(event) => event.id}
          rows={records}
        />
      )}
    </ManagementPage>
  );
}
