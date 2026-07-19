import type { FleetState } from "../types/fleet";
import type {
  DriverManagementRecord,
  MechanicManagementRecord,
  UserManagementRecord,
  VehicleManagementRecord,
} from "../types/management";
import { mileageService } from "./mileageService";

function getUser(data: FleetState, userId: string) {
  return data.users.find((user) => user.id === userId);
}

export const managementViewService = {
  getUsers(data: FleetState): UserManagementRecord[] {
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
          mechanic?.specialization ??
          manager?.depot ??
          "Administrative account",
        user,
      };
    });
  },

  getDrivers(data: FleetState): DriverManagementRecord[] {
    return data.driverProfiles.flatMap((profile) => {
      const user = getUser(data, profile.userId);
      if (!user) return [];
      const activeAssignment = data.assignments.find(
        (assignment) =>
          assignment.driverId === profile.id && assignment.status === "Active",
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

  getMechanics(data: FleetState): MechanicManagementRecord[] {
    return data.mechanicProfiles.flatMap((profile) => {
      const user = getUser(data, profile.userId);
      if (!user) return [];
      const work = data.maintenanceWorkOrders.filter(
        (record) => record.assignedMechanicId === profile.id,
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

  getVehicles(data: FleetState): VehicleManagementRecord[] {
    return data.vehicles.map((vehicle) => {
      const assignment = data.assignments.find(
        (item) => item.vehicleId === vehicle.id && item.status === "Active",
      );
      const driverProfile = assignment
        ? data.driverProfiles.find(
            (profile) => profile.id === assignment.driverId,
          )
        : undefined;
      return {
        assignedDriver: driverProfile
          ? getUser(data, driverProfile.userId)
          : undefined,
        serviceStatuses: mileageService.getVehicleServiceStatuses(
          data,
          vehicle.id,
        ),
        vehicle,
      };
    });
  },
};
