import type {
  FleetState,
  MileageLog,
  MileageMaintenanceStatus,
  VehicleServiceMileageStatus,
} from "../types/fleet";

/** The due-soon window is the final 10% of a service interval. */
export const DUE_SOON_INTERVAL_RATIO = 0.1;

const STATUS_RANK: Record<MileageMaintenanceStatus, number> = {
  not_due: 0,
  due_soon: 1,
  due_now: 2,
  overdue: 3,
};

function byLatestReading(left: MileageLog, right: MileageLog) {
  return (
    right.odometerReading - left.odometerReading ||
    right.logDate.localeCompare(left.logDate)
  );
}

function getStatus(
  currentMileage: number,
  dueSoonMileage: number,
  nextServiceMileage: number,
): MileageMaintenanceStatus {
  if (currentMileage > nextServiceMileage) return "overdue";
  if (currentMileage === nextServiceMileage) return "due_now";
  if (currentMileage >= dueSoonMileage) return "due_soon";
  return "not_due";
}

export const mileageService = {
  getLatestVehicleLog(data: FleetState, vehicleId: string) {
    return [...data.mileageLogs]
      .filter((entry) => entry.vehicleId === vehicleId)
      .sort(byLatestReading)[0];
  },

  getVehicleServiceStatuses(
    data: FleetState,
    vehicleId: string,
    currentMileage?: number,
  ): VehicleServiceMileageStatus[] {
    const vehicle = data.vehicles.find((item) => item.id === vehicleId);
    if (!vehicle) return [];

    const effectiveMileage = currentMileage ?? vehicle.currentMileage;
    return data.serviceTypes
      .filter((serviceType) => serviceType.status === "Active")
      .map((serviceType) => {
        const latestHistory = data.maintenanceHistory
          .filter(
            (record) =>
              record.vehicleId === vehicleId &&
              record.serviceTypeId === serviceType.id,
          )
          .sort(
            (left, right) =>
              right.odometerAtService - left.odometerAtService ||
              right.serviceDate.localeCompare(left.serviceDate),
          )[0];
        const lastServiceMileage = latestHistory?.odometerAtService ?? null;
        const intervalStart = lastServiceMileage ?? 0;
        const nextServiceMileage =
          intervalStart + serviceType.recommendedIntervalKm;
        const dueSoonMileage =
          nextServiceMileage -
          Math.ceil(
            serviceType.recommendedIntervalKm * DUE_SOON_INTERVAL_RATIO,
          );

        return {
          currentMileage: effectiveMileage,
          dueSoonMileage,
          lastServiceMileage,
          nextServiceMileage,
          serviceTypeId: serviceType.id,
          status: getStatus(
            effectiveMileage,
            dueSoonMileage,
            nextServiceMileage,
          ),
          vehicleId,
        };
      });
  },

  getCrossedServiceThresholds(
    before: readonly VehicleServiceMileageStatus[],
    after: readonly VehicleServiceMileageStatus[],
  ) {
    const previousByServiceType = new Map(
      before.map((item) => [item.serviceTypeId, item]),
    );

    return after.filter((current) => {
      const previous = previousByServiceType.get(current.serviceTypeId);
      return (
        current.status !== "not_due" &&
        (!previous ||
          STATUS_RANK[current.status] > STATUS_RANK[previous.status])
      );
    });
  },
};
