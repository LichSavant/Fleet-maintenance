import type { FleetDataSource } from "../types/fleet";
import type {
  DriverManagementRecord,
  MechanicManagementRecord,
  UserManagementRecord,
  VehicleManagementRecord,
} from "../types/management";

function getUser(data: FleetDataSource, userId: string) {
  return data.users.find((user) => user.id === userId);
}

export const managementViewService = {
  getUsers(data: FleetDataSource): UserManagementRecord[] {
    return data.users.map((user) => {
      const driver = data.driverProfiles.find(
        (profile) => profile.userId === user.id,
      );
      const mechanic = data.mechanicProfiles.find(
        (profile) => profile.userId === user.id,
      );
      const manager = data.managerProfiles.find(
        (profile) => profile.userId === user.id,
      );
      return {
        profileDetail:
          driver?.licenseNumber ??
          mechanic?.specialty ??
          manager?.depot ??
          "Administrative account",
        user,
      };
    });
  },

  getDrivers(data: FleetDataSource): DriverManagementRecord[] {
    return data.driverProfiles.flatMap((profile) => {
      const user = getUser(data, profile.userId);
      if (!user) return [];
      const activeAssignment = data.assignments.find(
        (assignment) =>
          assignment.driverProfileId === profile.id &&
          assignment.status === "Active",
      );
      return [
        {
          activeAssignment,
          assignedVehicle: activeAssignment
            ? data.vehicles.find(
                (vehicle) => vehicle.id === activeAssignment.vehicleId,
              )
            : undefined,
          profile,
          user,
        },
      ];
    });
  },

  getMechanics(data: FleetDataSource): MechanicManagementRecord[] {
    return data.mechanicProfiles.flatMap((profile) => {
      const user = getUser(data, profile.userId);
      if (!user) return [];
      const work = data.maintenanceRecords.filter(
        (record) => record.mechanicProfileId === profile.id,
      );
      return [
        {
          completedWork: work.filter((record) => record.status === "completed")
            .length,
          openWork: work.filter(
            (record) =>
              record.status !== "completed" && record.status !== "cancelled",
          ).length,
          profile,
          user,
        },
      ];
    });
  },

  getVehicles(data: FleetDataSource): VehicleManagementRecord[] {
    return data.vehicles.map((vehicle) => {
      const assignment = data.assignments.find(
        (item) => item.vehicleId === vehicle.id && item.status === "Active",
      );
      const driverProfile = assignment
        ? data.driverProfiles.find(
            (profile) => profile.id === assignment.driverProfileId,
          )
        : undefined;
      const completedDates = data.maintenanceRecords
        .filter(
          (record) =>
            record.vehicleId === vehicle.id && Boolean(record.completedDate),
        )
        .map((record) => record.completedDate as string)
        .sort((left, right) => right.localeCompare(left));
      const nextDates = data.maintenanceSchedules
        .filter(
          (schedule) =>
            schedule.vehicleId === vehicle.id &&
            schedule.status !== "Converted" &&
            schedule.status !== "Cancelled",
        )
        .map((schedule) => schedule.dueDate)
        .sort();
      return {
        assignedDriver: driverProfile
          ? getUser(data, driverProfile.userId)
          : undefined,
        lastServiceDate: completedDates[0],
        nextServiceDate: nextDates[0],
        vehicle,
      };
    });
  },
};
