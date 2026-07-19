import type {
  FleetUserRecord,
  FleetDataSource,
  ServiceType,
  Vehicle,
} from "../types/fleet";

function getUser(data: FleetDataSource, userId: string) {
  return data.users.find((user) => user.id === userId);
}

function getMechanicUser(data: FleetDataSource, profileId: string | null) {
  if (!profileId) return undefined;
  const profile = data.mechanicProfiles.find((item) => item.id === profileId);
  return profile ? getUser(data, profile.userId) : undefined;
}

export interface AssignmentOperationalView {
  assignment: FleetDataSource["assignments"][number];
  driver: FleetUserRecord;
  vehicle: Vehicle;
}

export interface ScheduleOperationalView {
  mechanic?: FleetUserRecord;
  schedule: FleetDataSource["maintenanceSchedules"][number];
  serviceType: ServiceType;
  vehicle: Vehicle;
}

export interface WorkOrderOperationalView {
  mechanic?: FleetUserRecord;
  serviceType: ServiceType;
  vehicle: Vehicle;
  workOrder: FleetDataSource["maintenanceRecords"][number];
}

function getAssignments(data: FleetDataSource) {
  return data.assignments.flatMap<AssignmentOperationalView>((assignment) => {
    const profile = data.driverProfiles.find(
      (driver) => driver.id === assignment.driverProfileId,
    );
    const driver = profile ? getUser(data, profile.userId) : undefined;
    const vehicle = data.vehicles.find(
      (item) => item.id === assignment.vehicleId,
    );
    return driver && vehicle ? [{ assignment, driver, vehicle }] : [];
  });
}

function getSchedules(data: FleetDataSource) {
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
              mechanic: getMechanicUser(data, schedule.mechanicProfileId),
              schedule,
              serviceType,
              vehicle,
            },
          ]
        : [];
    },
  );
}

function getWorkOrders(data: FleetDataSource) {
  return data.maintenanceRecords.flatMap<WorkOrderOperationalView>(
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
              mechanic: getMechanicUser(data, workOrder.mechanicProfileId),
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
  getEligibleDrivers(data: FleetDataSource) {
    return data.driverProfiles.flatMap((profile) => {
      const user = getUser(data, profile.userId);
      return profile.status === "Available" && user?.status === "Active"
        ? [{ profile, user }]
        : [];
    });
  },
  getEligibleVehicles(data: FleetDataSource) {
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
  getServiceHistory(data: FleetDataSource) {
    return getWorkOrders(data).filter(
      ({ workOrder }) => workOrder.status === "completed",
    );
  },
  getWorkOrdersForMechanic(data: FleetDataSource, userId: string) {
    const profile = data.mechanicProfiles.find(
      (item) => item.userId === userId,
    );
    return profile
      ? getWorkOrders(data).filter(
          ({ workOrder }) => workOrder.mechanicProfileId === profile.id,
        )
      : [];
  },
  getDriverMaintenance(data: FleetDataSource, userId: string) {
    const profile = data.driverProfiles.find((item) => item.userId === userId);
    const assignment = profile
      ? data.assignments.find(
          (item) =>
            item.driverProfileId === profile.id && item.status === "Active",
        )
      : undefined;
    const vehicle = assignment
      ? data.vehicles.find((item) => item.id === assignment.vehicleId)
      : undefined;
    if (!vehicle) return { schedules: [], vehicle: undefined, workOrders: [] };
    return {
      schedules: getSchedules(data).filter(
        ({ schedule }) =>
          schedule.vehicleId === vehicle.id &&
          schedule.status !== "Cancelled" &&
          schedule.status !== "Converted",
      ),
      vehicle,
      workOrders: getWorkOrders(data).filter(
        ({ workOrder }) => workOrder.vehicleId === vehicle.id,
      ),
    };
  },
};
