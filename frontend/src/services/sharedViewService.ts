import type { AuthUser } from "../types/auth";
import type { FleetState } from "../types/fleet";
import { mileageService } from "./mileageService";

function byNewest<T>(items: readonly T[], getDate: (item: T) => string) {
  return [...items].sort(
    (left, right) =>
      new Date(getDate(right)).getTime() - new Date(getDate(left)).getTime(),
  );
}

export const sharedViewService = {
  getNotifications(data: FleetState, user: AuthUser) {
    return byNewest(
      data.notifications.filter(
        (notification) => notification.userId === user.id,
      ),
      (notification) => notification.createdAt,
    );
  },

  getDriverMileage(data: FleetState, userId: string) {
    const profile = data.driverProfiles.find((item) => item.userId === userId);
    const assignment = profile
      ? data.assignments.find(
          (item) => item.driverId === profile.id && item.status === "Active",
        )
      : undefined;
    const vehicle = assignment
      ? data.vehicles.find((item) => item.id === assignment.vehicleId)
      : undefined;
    const history = profile
      ? byNewest(
          data.mileageLogs.filter((entry) => entry.driverId === profile.id),
          (entry) => entry.logDate,
        )
      : [];
    const latestEntry = vehicle
      ? mileageService.getLatestVehicleLog(data, vehicle.id)
      : undefined;
    const serviceStatuses = vehicle
      ? mileageService.getVehicleServiceStatuses(data, vehicle.id)
      : [];
    return {
      assignment,
      history,
      latestEntry,
      profile,
      serviceStatuses,
      vehicle,
    };
  },

  getProfile(data: FleetState, userId: string) {
    const user = data.users.find((item) => item.id === userId);
    if (!user) return undefined;
    const roleDetail =
      data.driverProfiles.find((item) => item.userId === userId)
        ?.licenseNumber ??
      data.mechanicProfiles.find((item) => item.userId === userId)
        ?.specialization ??
      data.managerProfiles.find((item) => item.userId === userId)?.depot ??
      "Fleet administration";
    return { roleDetail, user };
  },
};
