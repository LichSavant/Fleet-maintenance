import type { FleetDataSource } from "../types/fleet";
import { USER_ROLES } from "../types/auth";
import { formatRole } from "../utils/roleRoutes";
import { formatStatus } from "../utils/formatStatus";

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
  getReports(data: FleetDataSource) {
    const vehicleStatus = countBy(data.vehicles, (vehicle) => vehicle.status);
    const maintenanceStatus = countBy(data.maintenanceRecords, (record) =>
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
    const recordedMileage = data.mileageSubmissions.reduce(
      (total, submission) => total + submission.mileage,
      0,
    );
    const latestReadings = data.vehicles.reduce(
      (total, vehicle) => total + vehicle.mileage,
      0,
    );
    const mileageSummary = [
      { label: "Submissions", value: data.mileageSubmissions.length },
      { label: "Vehicles with readings", value: data.vehicles.length },
      { label: "Combined current odometers (km)", value: latestReadings },
      { label: "Recorded reading total (km)", value: recordedMileage },
    ];

    return {
      assignmentSummary,
      maintenanceStatus,
      mileageSummary,
      userRoleSummary,
      vehicleStatus,
    };
  },
};
