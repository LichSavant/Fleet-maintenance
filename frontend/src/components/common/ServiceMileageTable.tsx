import type {
  FleetState,
  VehicleServiceMileageStatus,
} from "../../types/fleet";
import { formatStatus } from "../../utils/formatStatus";
import { getStatusTone } from "../../utils/statusTone";
import { StatusBadge } from "../ui/StatusBadge";
import { Table } from "../ui/Table";

interface ServiceMileageTableProps {
  caption?: string;
  data: Pick<FleetState, "serviceTypes" | "vehicles">;
  emptyDescription?: string;
  emptyTitle?: string;
  rows: readonly VehicleServiceMileageStatus[];
  showVehicle?: boolean;
}

function formatMileage(value: number | null) {
  return value === null ? "No history" : `${value.toLocaleString()} km`;
}

export function ServiceMileageTable({
  caption = "Mileage-based service calculations",
  data,
  emptyDescription = "Active service types will appear after they are defined.",
  emptyTitle = "No service calculations",
  rows,
  showVehicle = false,
}: ServiceMileageTableProps) {
  return (
    <Table<VehicleServiceMileageStatus>
      caption={caption}
      columns={[
        ...(showVehicle
          ? [
              {
                header: "Vehicle",
                key: "vehicle",
                render: (entry: VehicleServiceMileageStatus) => {
                  const vehicle = data.vehicles.find(
                    (vehicle) => vehicle.id === entry.vehicleId,
                  );
                  return vehicle
                    ? `${vehicle.fleetNumber} · ${vehicle.plateNumber}`
                    : "Unknown vehicle";
                },
              },
            ]
          : []),
        {
          header: "Service",
          key: "service",
          render: (entry) =>
            data.serviceTypes.find(
              (serviceType) => serviceType.id === entry.serviceTypeId,
            )?.name ?? "Unknown service",
        },
        {
          align: "right",
          header: "Current mileage",
          key: "current-mileage",
          render: (entry) => formatMileage(entry.currentMileage),
        },
        {
          align: "right",
          header: "Last completed service",
          key: "last-service",
          render: (entry) => formatMileage(entry.lastCompletedServiceMileage),
        },
        {
          align: "right",
          header: "Recommended interval",
          key: "interval",
          render: (entry) => formatMileage(entry.recommendedIntervalKm),
        },
        {
          align: "right",
          header: "Next service",
          key: "next-service",
          render: (entry) => formatMileage(entry.nextServiceMileage),
        },
        {
          align: "right",
          header: "Remaining distance",
          key: "remaining",
          render: (entry) => formatMileage(entry.remainingDistance),
        },
        {
          header: "Status",
          key: "status",
          render: (entry) => (
            <StatusBadge tone={getStatusTone(entry.status)}>
              {formatStatus(entry.status)}
            </StatusBadge>
          ),
        },
      ]}
      emptyDescription={emptyDescription}
      emptyTitle={emptyTitle}
      getRowKey={(entry) => `${entry.vehicleId}-${entry.serviceTypeId}`}
      rows={[...rows]}
    />
  );
}
