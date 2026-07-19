import { useMemo, useState } from "react";

import { ErrorState } from "../../components/common/ErrorState";
import { ManagementLoadingState } from "../../components/common/ManagementLoadingState";
import { ManagementPage } from "../../components/common/ManagementPage";
import { RecordActions } from "../../components/common/RecordActions";
import { RecordDetailsModal } from "../../components/common/RecordDetailsModal";
import {
  VehicleFormModal,
  type VehicleFormValues,
} from "../../components/common/VehicleFormModal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Pagination } from "../../components/ui/Pagination";
import { SearchInput } from "../../components/ui/SearchInput";
import { Select } from "../../components/ui/Select";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Table, type TableColumn } from "../../components/ui/Table";
import { useFleetData } from "../../hooks/useFleetData";
import { fleetDataService } from "../../services/fleetDataService";
import { managementViewService } from "../../services/managementViewService";
import type { VehicleStatus } from "../../types/fleet";
import type {
  VehicleInput,
  VehicleManagementRecord,
} from "../../types/management";
import { formatDate } from "../../utils/formatDate";
import { getStatusTone } from "../../utils/statusTone";

const PAGE_SIZE = 5;

export default function VehiclesPage() {
  const { data, error, isLoading, reload } = useFleetData();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<VehicleStatus | "all">("all");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("fleet-asc");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<VehicleManagementRecord | null>(null);
  const [viewing, setViewing] = useState<VehicleManagementRecord | null>(null);
  const [deactivating, setDeactivating] =
    useState<VehicleManagementRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);

  const vehicleTypes = useMemo(
    () =>
      [...new Set(data?.vehicles.map((vehicle) => vehicle.type) ?? [])].sort(),
    [data],
  );

  const records = useMemo(() => {
    if (!data) return [];
    const query = search.trim().toLowerCase();
    return managementViewService
      .getVehicles(data)
      .filter(
        (record) =>
          (!query ||
            record.vehicle.fleetNumber.toLowerCase().includes(query) ||
            record.vehicle.plate.toLowerCase().includes(query) ||
            record.vehicle.manufacturer.toLowerCase().includes(query) ||
            record.vehicle.model.toLowerCase().includes(query) ||
            record.assignedDriver?.fullName.toLowerCase().includes(query)) &&
          (status === "all" || record.vehicle.status === status) &&
          (type === "all" || record.vehicle.type === type),
      )
      .sort((left, right) => {
        if (sort === "fleet-desc") {
          return right.vehicle.fleetNumber.localeCompare(
            left.vehicle.fleetNumber,
          );
        }
        if (sort === "mileage")
          return right.vehicle.mileage - left.vehicle.mileage;
        if (sort === "year") return right.vehicle.year - left.vehicle.year;
        return left.vehicle.fleetNumber.localeCompare(
          right.vehicle.fleetNumber,
        );
      });
  }, [data, search, sort, status, type]);

  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = records.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const columns: Array<TableColumn<VehicleManagementRecord>> = [
    {
      header: "Vehicle",
      key: "vehicle",
      render: (record) => (
        <div className="primary-cell">
          <strong>{record.vehicle.fleetNumber}</strong>
          <span>{record.vehicle.plate}</span>
        </div>
      ),
    },
    {
      header: "Make and model",
      key: "model",
      render: (record) =>
        `${record.vehicle.manufacturer} ${record.vehicle.model}`,
    },
    {
      header: "Year / type",
      key: "type",
      render: (record) => `${record.vehicle.year} · ${record.vehicle.type}`,
    },
    {
      header: "Mileage",
      key: "mileage",
      render: (record) => `${record.vehicle.mileage.toLocaleString()} km`,
    },
    {
      header: "Assigned driver",
      key: "driver",
      render: (record) => record.assignedDriver?.fullName ?? "Unassigned",
    },
    {
      header: "Status",
      key: "status",
      render: (record) => (
        <StatusBadge tone={getStatusTone(record.vehicle.status)}>
          {record.vehicle.status}
        </StatusBadge>
      ),
    },
    {
      align: "right",
      header: "Actions",
      key: "actions",
      render: (record) => (
        <RecordActions
          deactivateDisabled={record.vehicle.status === "Out of Service"}
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

  const initialValues: VehicleFormValues | null = editing
    ? { ...editing.vehicle }
    : null;

  const saveVehicle = async (values: VehicleInput) => {
    if (editing) {
      await fleetDataService.updateVehicle(editing.vehicle.id, values);
      setFeedback({ message: "Vehicle record updated.", tone: "success" });
    } else {
      await fleetDataService.createVehicle(values);
      setFeedback({ message: "Vehicle added to the fleet.", tone: "success" });
    }
    setIsFormOpen(false);
    setEditing(null);
    await reload();
  };

  const confirmDeactivation = async () => {
    if (!deactivating) return;
    setIsDeactivating(true);
    try {
      await fleetDataService.deactivateVehicle(deactivating.vehicle.id);
      setFeedback({
        message: "Vehicle marked out of service.",
        tone: "success",
      });
      setDeactivating(null);
      await reload();
    } catch (deactivationError) {
      setFeedback({
        message:
          deactivationError instanceof Error
            ? deactivationError.message
            : "The vehicle could not be deactivated.",
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
        addLabel="Add vehicle"
        breadcrumb="Vehicles"
        controls={
          <>
            <SearchInput
              id="vehicle-search"
              label="Search vehicles"
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search fleet number, plate, or driver"
              value={search}
            />
            <label className="toolbar-field">
              <span>Status</span>
              <Select
                onChange={(event) => {
                  setStatus(event.target.value as VehicleStatus | "all");
                  setPage(1);
                }}
                value={status}
              >
                <option value="all">All statuses</option>
                <option value="Active">Active</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Inspection">Inspection</option>
                <option value="Out of Service">Out of service</option>
              </Select>
            </label>
            <label className="toolbar-field">
              <span>Type</span>
              <Select
                onChange={(event) => {
                  setType(event.target.value);
                  setPage(1);
                }}
                value={type}
              >
                <option value="all">All vehicle types</option>
                {vehicleTypes.map((vehicleType) => (
                  <option key={vehicleType} value={vehicleType}>
                    {vehicleType}
                  </option>
                ))}
              </Select>
            </label>
            <label className="toolbar-field">
              <span>Sort</span>
              <Select
                onChange={(event) => setSort(event.target.value)}
                value={sort}
              >
                <option value="fleet-asc">Fleet number A–Z</option>
                <option value="fleet-desc">Fleet number Z–A</option>
                <option value="mileage">Highest mileage</option>
                <option value="year">Newest year</option>
              </Select>
            </label>
          </>
        }
        description="Manage vehicle identity, condition, mileage, service dates, and assignment visibility."
        feedback={feedback}
        onAdd={() => {
          setEditing(null);
          setIsFormOpen(true);
        }}
        title="Vehicle management"
      >
        {isLoading ? (
          <ManagementLoadingState label="Loading vehicle records" />
        ) : error ? (
          <ErrorState
            description={error}
            onRetry={reload}
            title="Vehicles could not be loaded"
          />
        ) : (
          <>
            <Table
              caption="ForgeFleet vehicles"
              columns={columns}
              emptyDescription="Adjust the search or filters, or add a vehicle."
              emptyTitle="No matching vehicles"
              getRowKey={(record) => record.vehicle.id}
              rows={pageRows}
            />
            {totalPages > 1 && (
              <Pagination
                currentPage={safePage}
                label="Vehicle pages"
                onPageChange={setPage}
                totalPages={totalPages}
              />
            )}
          </>
        )}
      </ManagementPage>

      {isFormOpen && (
        <VehicleFormModal
          initialValues={initialValues}
          isOpen
          onClose={() => {
            setIsFormOpen(false);
            setEditing(null);
          }}
          onSubmit={saveVehicle}
        />
      )}
      <RecordDetailsModal
        details={
          viewing
            ? [
                { label: "Fleet number", value: viewing.vehicle.fleetNumber },
                { label: "Plate number", value: viewing.vehicle.plate },
                {
                  label: "Make and model",
                  value: `${viewing.vehicle.manufacturer} ${viewing.vehicle.model}`,
                },
                { label: "Year", value: viewing.vehicle.year },
                { label: "Vehicle type", value: viewing.vehicle.type },
                { label: "Status", value: viewing.vehicle.status },
                {
                  label: "Mileage",
                  value: `${viewing.vehicle.mileage.toLocaleString()} km`,
                },
                {
                  label: "Assigned driver",
                  value: viewing.assignedDriver?.fullName ?? "Unassigned",
                },
                {
                  label: "Last service",
                  value: viewing.lastServiceDate
                    ? formatDate(viewing.lastServiceDate)
                    : "No completed service",
                },
                {
                  label: "Next service",
                  value: viewing.nextServiceDate
                    ? formatDate(viewing.nextServiceDate)
                    : "Not scheduled",
                },
              ]
            : []
        }
        isOpen={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title="Vehicle record"
      />
      <ConfirmDialog
        confirmLabel="Take out of service"
        description="Active assignments or open maintenance work prevent this action. Historical vehicle records will remain intact."
        isConfirming={isDeactivating}
        isOpen={Boolean(deactivating)}
        onCancel={() => setDeactivating(null)}
        onConfirm={confirmDeactivation}
        title={`Take ${deactivating?.vehicle.fleetNumber ?? "vehicle"} out of service?`}
        tone="danger"
      />
    </>
  );
}
