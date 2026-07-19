import type { FleetState, ServiceType, User, Vehicle } from "../types/fleet";
import { mileageService } from "./mileageService";

function getUser(data: FleetState, userId: string) {
  return data.users.find((user) => user.id === userId);
}

function getMechanicUser(data: FleetState, profileId: string | null) {
  if (!profileId) return undefined;
  const profile = data.mechanicProfiles.find((item) => item.id === profileId);
  return profile ? getUser(data, profile.userId) : undefined;
}

export interface AssignmentOperationalView {
  assignment: FleetState["assignments"][number];
  driver: User;
  vehicle: Vehicle;
}

export interface ScheduleOperationalView {
  mechanic?: User;
  schedule: FleetState["maintenanceSchedules"][number];
  serviceType: ServiceType;
  vehicle: Vehicle;
}

export interface WorkOrderOperationalView {
  mechanic?: User;
  serviceType: ServiceType;
  vehicle: Vehicle;
  workOrder: FleetState["maintenanceWorkOrders"][number];
}

export interface ServiceHistoryOperationalView {
  history: FleetState["maintenanceHistory"][number];
  mechanic?: User;
  serviceType: ServiceType;
  vehicle: Vehicle;
}

function getAssignments(data: FleetState) {
  return data.assignments.flatMap<AssignmentOperationalView>((assignment) => {
    const profile = data.driverProfiles.find(
      (driver) => driver.id === assignment.driverId,
    );
    const driver = profile ? getUser(data, profile.userId) : undefined;
    const vehicle = data.vehicles.find(
      (item) => item.id === assignment.vehicleId,
    );
    return driver && vehicle ? [{ assignment, driver, vehicle }] : [];
  });
}

function getSchedules(data: FleetState) {
  return data.maintenanceSchedules.flatMap<ScheduleOperationalView>(
    (schedule) => {
      const vehicle = data.vehicles.find(
        (item) => item.id === schedule.vehicleId,
      );
      const serviceType = data.serviceTypes.find(
        (item) => item.id === schedule.serviceTypeId,
      );
      return vehicle && serviceType
        ? [
            {
              mechanic: getMechanicUser(data, schedule.assignedMechanicId),
              schedule,
              serviceType,
              vehicle,
            },
          ]
        : [];
    },
  );
}

function getWorkOrders(data: FleetState) {
  return data.maintenanceWorkOrders.flatMap<WorkOrderOperationalView>(
    (workOrder) => {
      const vehicle = data.vehicles.find(
        (item) => item.id === workOrder.vehicleId,
      );
      const serviceType = data.serviceTypes.find(
        (item) => item.id === workOrder.serviceTypeId,
      );
      return vehicle && serviceType
        ? [
            {
              mechanic: getMechanicUser(data, workOrder.assignedMechanicId),
              serviceType,
              vehicle,
              workOrder,
            },
          ]
        : [];
    },
  );
}

export const operationsViewService = {
  getAssignments,
  getEligibleDrivers(data: FleetState) {
    return data.driverProfiles.flatMap((profile) => {
      const user = getUser(data, profile.userId);
      return profile.status === "Available" && user?.status === "Active"
        ? [{ profile, user }]
        : [];
    });
  },
  getEligibleVehicles(data: FleetState) {
    const assignedVehicleIds = new Set(
      data.assignments
        .filter((assignment) => assignment.status === "Active")
        .map((assignment) => assignment.vehicleId),
    );
    return data.vehicles.filter(
      (vehicle) =>
        vehicle.status === "Active" && !assignedVehicleIds.has(vehicle.id),
    );
  },
  getSchedules,
  getWorkOrders,
  getServiceHistory(data: FleetState) {
    return data.maintenanceHistory.flatMap<ServiceHistoryOperationalView>(
      (history) => {
        const vehicle = data.vehicles.find(
          (item) => item.id === history.vehicleId,
        );
        const serviceType = data.serviceTypes.find(
          (item) => item.id === history.serviceTypeId,
        );
        return vehicle && serviceType
          ? [
              {
                history,
                mechanic: getMechanicUser(data, history.mechanicId),
                serviceType,
                vehicle,
              },
            ]
          : [];
      },
    );
  },
  getWorkOrdersForMechanic(data: FleetState, userId: string) {
    const profile = data.mechanicProfiles.find(
      (item) => item.userId === userId,
    );
    return profile
      ? getWorkOrders(data).filter(
          ({ workOrder }) => workOrder.assignedMechanicId === profile.id,
        )
      : [];
  },
  getDriverMaintenance(data: FleetState, userId: string) {
    const profile = data.driverProfiles.find((item) => item.userId === userId);
    const assignment = profile
      ? data.assignments.find(
          (item) => item.driverId === profile.id && item.status === "Active",
        )
      : undefined;
    const vehicle = assignment
      ? data.vehicles.find((item) => item.id === assignment.vehicleId)
      : undefined;
    if (!vehicle)
      return {
        schedules: [],
        serviceStatuses: [],
        vehicle: undefined,
        workOrders: [],
      };
    return {
      schedules: getSchedules(data).filter(
        ({ schedule }) =>
          schedule.vehicleId === vehicle.id &&
          schedule.status !== "Cancelled" &&
          schedule.status !== "Converted",
      ),
      serviceStatuses: mileageService.getVehicleServiceStatuses(
        data,
        vehicle.id,
      ),
      vehicle,
      workOrders: getWorkOrders(data).filter(
        ({ workOrder }) => workOrder.vehicleId === vehicle.id,
      ),
    };
  },
};
