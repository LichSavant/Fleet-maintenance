import type {
  FleetState,
  MileageLog,
  MileageMaintenanceStatus,
  VehicleServiceMileageStatus,
} from "../types/fleet";

/** One centralized threshold for every mileage-based service calculation. */
export const DUE_SOON_THRESHOLD_KM = 1000;

const STATUS_RANK: Record<MileageMaintenanceStatus, number> = {
  NO_HISTORY: 0,
  UPCOMING: 1,
  DUE_SOON: 2,
  DUE_NOW: 3,
  OVERDUE: 4,
};

function byLatestReading(left: MileageLog, right: MileageLog) {
  return (
    right.odometerReading - left.odometerReading ||
    right.logDate.localeCompare(left.logDate)
  );
}

function getStatus(remainingDistance: number): MileageMaintenanceStatus {
  if (remainingDistance < 0) return "OVERDUE";
  if (remainingDistance === 0) return "DUE_NOW";
  if (remainingDistance <= DUE_SOON_THRESHOLD_KM) return "DUE_SOON";
  return "UPCOMING";
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
              right.serviceDate.localeCompare(left.serviceDate) ||
              right.odometerAtService - left.odometerAtService,
          )[0];
        const lastCompletedServiceMileage =
          latestHistory?.odometerAtService ?? null;

        if (lastCompletedServiceMileage === null) {
          return {
            currentMileage: effectiveMileage,
            lastCompletedServiceMileage: null,
            nextServiceMileage: null,
            recommendedIntervalKm: serviceType.recommendedIntervalKm,
            remainingDistance: null,
            serviceTypeId: serviceType.id,
            status: "NO_HISTORY" as const,
            vehicleId,
          };
        }

        const nextServiceMileage =
          lastCompletedServiceMileage + serviceType.recommendedIntervalKm;
        const remainingDistance = nextServiceMileage - effectiveMileage;

        return {
          currentMileage: effectiveMileage,
          lastCompletedServiceMileage,
          nextServiceMileage,
          recommendedIntervalKm: serviceType.recommendedIntervalKm,
          remainingDistance,
          serviceTypeId: serviceType.id,
          status: getStatus(remainingDistance),
          vehicleId,
        };
      });
  },

  getFleetServiceStatuses(data: FleetState) {
    return data.vehicles.flatMap((vehicle) =>
      mileageService.getVehicleServiceStatuses(data, vehicle.id),
    );
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
        !["NO_HISTORY", "UPCOMING"].includes(current.status) &&
        (!previous ||
          STATUS_RANK[current.status] > STATUS_RANK[previous.status])
      );
    });
  },
};
