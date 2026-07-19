import type { FleetState } from "../types/fleet";
import { USER_ROLES } from "../types/auth";
import { formatRole } from "../utils/roleRoutes";
import { formatStatus } from "../utils/formatStatus";
import { mileageService } from "./mileageService";

export interface MileageLogReportView {
  driver: FleetState["users"][number];
  mileageLog: FleetState["mileageLogs"][number];
  vehicle: FleetState["vehicles"][number];
}

function countBy<T>(items: readonly T[], getKey: (item: T) => string) {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort(
      (left, right) =>
        right.value - left.value || left.label.localeCompare(right.label),
    );
}

export const reportService = {
  getReports(data: FleetState) {
    const serviceMileageStatuses = mileageService.getFleetServiceStatuses(data);
    const serviceDueSummary = [
      "UPCOMING",
      "DUE_SOON",
      "DUE_NOW",
      "OVERDUE",
      "NO_HISTORY",
    ].map((status) => ({
      label: formatStatus(status),
      value: serviceMileageStatuses.filter((item) => item.status === status)
        .length,
    }));
    const vehicleStatus = countBy(data.vehicles, (vehicle) => vehicle.status);
    const maintenanceStatus = countBy(data.maintenanceWorkOrders, (record) =>
      formatStatus(record.status),
    );
    const assignmentSummary = countBy(
      data.assignments,
      (assignment) => assignment.status,
    );
    const userRoleSummary = USER_ROLES.map((role) => ({
      label: formatRole(role),
      value: data.users.filter((user) => user.role === role).length,
    }));
    const loggedVehicleIds = new Set(
      data.mileageLogs.map((submission) => submission.vehicleId),
    );
    const loggedDistance = [...loggedVehicleIds].reduce((total, vehicleId) => {
      const readings = data.mileageLogs
        .filter((submission) => submission.vehicleId === vehicleId)
        .map((submission) => submission.odometerReading);
      return readings.length < 2
        ? total
        : total + Math.max(...readings) - Math.min(...readings);
    }, 0);
    const latestReadings = data.vehicles.reduce(
      (total, vehicle) => total + vehicle.currentMileage,
      0,
    );
    const mileageSummary = [
      { label: "Submissions", value: data.mileageLogs.length },
      { label: "Vehicles with readings", value: loggedVehicleIds.size },
      { label: "Combined current odometers (km)", value: latestReadings },
      { label: "Distance between logged readings (km)", value: loggedDistance },
    ];
    const recentMileageLogs = [...data.mileageLogs]
      .sort((left, right) => right.logDate.localeCompare(left.logDate))
      .flatMap((mileageLog) => {
        const driverProfile = data.driverProfiles.find(
          (profile) => profile.id === mileageLog.driverId,
        );
        const driver = driverProfile
          ? data.users.find((user) => user.id === driverProfile.userId)
          : undefined;
        const vehicle = data.vehicles.find(
          (item) => item.id === mileageLog.vehicleId,
        );
        return driver && vehicle
          ? ([{ driver, mileageLog, vehicle }] satisfies MileageLogReportView[])
          : [];
      });

    return {
      assignmentSummary,
      maintenanceStatus,
      mileageSummary,
      recentMileageLogs,
      serviceDueSummary,
      serviceMileageStatuses,
      userRoleSummary,
      vehicleStatus,
    };
  },
};
