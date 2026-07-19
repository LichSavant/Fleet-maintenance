import { useMemo, useState } from "react";

import { ErrorState } from "../../components/common/ErrorState";
import { ManagementLoadingState } from "../../components/common/ManagementLoadingState";
import { ManagementPage } from "../../components/common/ManagementPage";
import { ServiceTypeFormModal } from "../../components/common/ServiceTypeFormModal";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { SearchInput } from "../../components/ui/SearchInput";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Table, type TableColumn } from "../../components/ui/Table";
import { useAuth } from "../../hooks/useAuth";
import { useFleetData } from "../../hooks/useFleetData";
import { fleetDataService } from "../../services/fleetDataService";
import type { ServiceType } from "../../types/fleet";
import type { ServiceTypeInput } from "../../types/operations";

export default function ServiceTypesPage() {
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useFleetData();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ServiceType | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deactivating, setDeactivating] = useState<ServiceType | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);
  const canManage = user?.role === "admin";

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...(data?.serviceTypes ?? [])]
      .filter(
        (serviceType) =>
          !query ||
          serviceType.name.toLowerCase().includes(query) ||
          serviceType.description.toLowerCase().includes(query),
      )
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [data, search]);

  const columns: Array<TableColumn<ServiceType>> = [
    {
      header: "Service type",
      key: "name",
      render: (serviceType) => (
        <div className="primary-cell">
          <strong>{serviceType.name}</strong>
        </div>
      ),
    },
    {
      header: "Description",
      key: "description",
      render: (serviceType) => serviceType.description,
    },
    {
      header: "Status",
      key: "status",
      render: (serviceType) => (
        <StatusBadge
          tone={serviceType.status === "Active" ? "success" : "neutral"}
        >
          {serviceType.status}
        </StatusBadge>
      ),
    },
    {
      align: "right",
      header: "Actions",
      key: "actions",
      render: (serviceType) =>
        canManage ? (
          <div className="record-actions">
            <Button
              onClick={() => {
                setEditing(serviceType);
                setIsFormOpen(true);
              }}
              size="small"
            >
              Edit
            </Button>
            <Button
              disabled={serviceType.status !== "Active"}
              onClick={() => setDeactivating(serviceType)}
              size="small"
              variant="danger"
            >
              Deactivate
            </Button>
          </div>
        ) : (
          <span className="table-muted">View only</span>
        ),
    },
  ];

  const saveServiceType = async (input: ServiceTypeInput) => {
    if (!user) return;
    if (editing) {
      await fleetDataService.updateServiceType(editing.id, input, user.id);
      setFeedback({ message: "Service type updated.", tone: "success" });
    } else {
      await fleetDataService.createServiceType(input, user.id);
      setFeedback({ message: "Service type created.", tone: "success" });
    }
    setEditing(null);
    setIsFormOpen(false);
    await reload();
  };

  const deactivate = async () => {
    if (!user || !deactivating) return;
    setIsDeactivating(true);
    try {
      await fleetDataService.deactivateServiceType(deactivating.id, user.id);
      setFeedback({
        message: "Service type deactivated; linked history was preserved.",
        tone: "success",
      });
      setDeactivating(null);
      await reload();
    } catch (deactivationError) {
      setFeedback({
        message:
          deactivationError instanceof Error
            ? deactivationError.message
            : "The service type could not be deactivated.",
        tone: "error",
      });
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <>
      <ManagementPage
        addLabel={canManage ? "Add service type" : undefined}
        breadcrumb="Service types"
        controls={
          <SearchInput
            id="service-type-search"
            label="Search service types"
            onChange={setSearch}
            placeholder="Search name or description"
            value={search}
          />
        }
        description={
          canManage
            ? "Maintain reusable service definitions without changing linked historical work."
            : "Review the service definitions used by schedules and work orders."
        }
        feedback={feedback}
        onAdd={
          canManage
            ? () => {
                setEditing(null);
                setIsFormOpen(true);
              }
            : undefined
        }
        title="Service types"
      >
        {isLoading ? (
          <ManagementLoadingState label="Loading service types" />
        ) : error ? (
          <ErrorState
            description={error}
            onRetry={reload}
            title="Service types could not be loaded"
          />
        ) : (
          <Table
            caption="Maintenance service types"
            columns={columns}
            emptyDescription="Add a reusable service definition."
            emptyTitle="No service types"
            getRowKey={(serviceType) => serviceType.id}
            rows={rows}
          />
        )}
      </ManagementPage>
      {isFormOpen && (
        <ServiceTypeFormModal
          initialValues={
            editing
              ? {
                  description: editing.description,
                  id: editing.id,
                  name: editing.name,
                  recommendedIntervalKm: editing.recommendedIntervalKm,
                }
              : null
          }
          isOpen
          onClose={() => {
            setEditing(null);
            setIsFormOpen(false);
          }}
          onSubmit={saveServiceType}
        />
      )}
      <ConfirmDialog
        confirmLabel="Deactivate service type"
        description="Existing schedules, work orders, and service history will keep their linked service definition. New records cannot select it."
        isConfirming={isDeactivating}
        isOpen={Boolean(deactivating)}
        onCancel={() => setDeactivating(null)}
        onConfirm={deactivate}
        title={`Deactivate ${deactivating?.name ?? "service type"}?`}
        tone="danger"
      />
    </>
  );
}
