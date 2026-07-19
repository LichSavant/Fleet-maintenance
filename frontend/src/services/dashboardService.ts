import type { AuthUser } from "../types/auth";
import type {
  AuditEvent,
  FleetState,
  MaintenanceHistoryRecord,
  MaintenanceWorkOrder,
  MileageLog,
  MileageMaintenanceStatus,
  Vehicle,
  VehicleAssignment,
  VehicleServiceMileageStatus,
} from "../types/fleet";
import { mileageService } from "./mileageService";
import { sharedViewService } from "./sharedViewService";

export interface ActivityView extends AuditEvent {
  actorName: string;
}

export interface AssignmentView extends VehicleAssignment {
  driverName: string;
  vehicle: Vehicle;
}

export interface MaintenanceView extends MaintenanceWorkOrder {
  mileageStatus?: VehicleServiceMileageStatus;
  service: string;
  vehicle: Vehicle;
}

export interface ServiceHistoryView extends MaintenanceHistoryRecord {
  service: string;
  vehicle: Vehicle;
}

export interface MileageView extends MileageLog {
  driverName: string;
  vehicle: Vehicle;
}

export interface ServiceMileageView extends VehicleServiceMileageStatus {
  service: string;
  vehicle: Vehicle;
}

export interface OperationalAlert {
  description: string;
  id: string;
  title: string;
  tone: "danger" | "warning";
}

const SERVICE_URGENCY: Record<MileageMaintenanceStatus, number> = {
  OVERDUE: 0,
  DUE_NOW: 1,
  DUE_SOON: 2,
  NO_HISTORY: 3,
  UPCOMING: 4,
};

const OPERATIONAL_ENTITY_TYPES = new Set<AuditEvent["entityType"]>([
  "assignment",
  "maintenance_history",
  "maintenance_schedule",
  "maintenance_work_order",
  "mileage_log",
  "service_type",
  "vehicle",
]);

function byNewest<T>(items: readonly T[], getDate: (item: T) => string) {
  return [...items].sort(
    (left, right) =>
      new Date(getDate(right)).getTime() - new Date(getDate(left)).getTime(),
  );
}

function getVehicle(data: FleetState, vehicleId: string) {
  return data.vehicles.find((vehicle) => vehicle.id === vehicleId);
}

function getUserName(data: FleetState, userId: string) {
  return (
    data.users.find((user) => user.id === userId)?.fullName ?? "Unknown user"
  );
}

function getDriverName(data: FleetState, driverId: string) {
  const profile = data.driverProfiles.find((driver) => driver.id === driverId);
  return profile ? getUserName(data, profile.userId) : "Unknown driver";
}

function enrichActivity(data: FleetState, events: readonly AuditEvent[]) {
  return byNewest(events, (event) => event.createdAt).map<ActivityView>(
    (event) => ({
      ...event,
      actorName: event.userDisplayName,
    }),
  );
}

function enrichAssignments(
  data: FleetState,
  assignments: readonly VehicleAssignment[],
) {
  return assignments.flatMap<AssignmentView>((assignment) => {
    const vehicle = getVehicle(data, assignment.vehicleId);
    if (!vehicle) return [];
    return [
      {
        ...assignment,
        driverName: getDriverName(data, assignment.driverId),
        vehicle,
      },
    ];
  });
}

function enrichMaintenance(
  data: FleetState,
  records: readonly MaintenanceWorkOrder[],
) {
  return records.flatMap<MaintenanceView>((record) => {
    const vehicle = getVehicle(data, record.vehicleId);
    const serviceType = data.serviceTypes.find(
      (item) => item.id === record.serviceTypeId,
    );
    const mileageStatus = mileageService
      .getVehicleServiceStatuses(data, record.vehicleId)
      .find((item) => item.serviceTypeId === record.serviceTypeId);
    return vehicle && serviceType
      ? [{ ...record, mileageStatus, service: serviceType.name, vehicle }]
      : [];
  });
}

function enrichServiceMileage(
  data: FleetState,
  statuses: readonly VehicleServiceMileageStatus[],
) {
  return statuses.flatMap<ServiceMileageView>((status) => {
    const vehicle = getVehicle(data, status.vehicleId);
    const serviceType = data.serviceTypes.find(
      (item) => item.id === status.serviceTypeId,
    );
    return vehicle && serviceType
      ? [{ ...status, service: serviceType.name, vehicle }]
      : [];
  });
}

function enrichHistory(
  data: FleetState,
  records: readonly MaintenanceHistoryRecord[],
) {
  return records.flatMap<ServiceHistoryView>((record) => {
    const vehicle = getVehicle(data, record.vehicleId);
    const serviceType = data.serviceTypes.find(
      (item) => item.id === record.serviceTypeId,
    );
    return vehicle && serviceType
      ? [{ ...record, service: serviceType.name, vehicle }]
      : [];
  });
}

function enrichMileage(data: FleetState, submissions: readonly MileageLog[]) {
  return submissions.flatMap<MileageView>((submission) => {
    const vehicle = getVehicle(data, submission.vehicleId);
    if (!vehicle) return [];
    return [
      {
        ...submission,
        driverName: getDriverName(data, submission.driverId),
        vehicle,
      },
    ];
  });
}

function sortServiceMileage(statuses: readonly ServiceMileageView[]) {
  return [...statuses].sort(
    (left, right) =>
      SERVICE_URGENCY[left.status] - SERVICE_URGENCY[right.status] ||
      (left.remainingDistance ?? Number.POSITIVE_INFINITY) -
        (right.remainingDistance ?? Number.POSITIVE_INFINITY) ||
      left.service.localeCompare(right.service),
  );
}

function getActiveAssignments(data: FleetState) {
  return data.assignments.filter(
    (assignment) => assignment.status === "Active",
  );
}

function getNotificationsForUser(data: FleetState, user: AuthUser) {
  return sharedViewService.getNotifications(data, user);
}

export const dashboardService = {
  getNotificationsForUser,

  getAdminDashboard(data: FleetState) {
    const activeAssignments = getActiveAssignments(data);
    const assignedVehicleIds = new Set(
      activeAssignments.map((assignment) => assignment.vehicleId),
    );
    const serviceStatuses = mileageService.getFleetServiceStatuses(data);

    return {
      activeUsers: data.users.filter((user) => user.status === "Active").length,
      assignedVehicles: assignedVehicleIds.size,
      availableVehicles: data.vehicles.filter(
        (vehicle) =>
          vehicle.status === "Active" && !assignedVehicleIds.has(vehicle.id),
      ).length,
      dueSoonServices: serviceStatuses.filter(
        (item) => item.status === "DUE_SOON",
      ).length,
      overdueServices: serviceStatuses.filter(
        (item) => item.status === "OVERDUE",
      ).length,
      recentActivity: enrichActivity(data, data.auditEvents).slice(0, 6),
      totalUsers: data.users.length,
      totalVehicles: data.vehicles.length,
      underMaintenanceVehicles: data.vehicles.filter(
        (vehicle) => vehicle.status === "Maintenance",
      ).length,
    };
  },

  getManagerDashboard(data: FleetState, userId: string) {
    const activeAssignments = getActiveAssignments(data);
    const assignedVehicleIds = new Set(
      activeAssignments.map((assignment) => assignment.vehicleId),
    );
    const serviceMileageStatuses = sortServiceMileage(
      enrichServiceMileage(data, mileageService.getFleetServiceStatuses(data)),
    );
    const dueSoonServices = serviceMileageStatuses.filter(
      (item) => item.status === "DUE_SOON",
    );
    const overdueServices = serviceMileageStatuses.filter(
      (item) => item.status === "OVERDUE",
    );
    const operationalAlerts: OperationalAlert[] = [
      ...serviceMileageStatuses
        .filter(
          (item) =>
            item.status === "DUE_SOON" ||
            item.status === "DUE_NOW" ||
            item.status === "OVERDUE",
        )
        .map<OperationalAlert>((item) => ({
          description: `${item.vehicle.plateNumber} · ${item.remainingDistance?.toLocaleString()} km remaining`,
          id: `alert-${item.vehicleId}-${item.serviceTypeId}`,
          title: item.service,
          tone: item.status === "OVERDUE" ? "danger" : "warning",
        })),
      ...data.vehicles
        .filter((vehicle) => vehicle.status === "Out of Service")
        .map<OperationalAlert>((vehicle) => ({
          description: `${vehicle.model} requires operational review.`,
          id: `alert-${vehicle.id}`,
          title: `${vehicle.plateNumber} is out of service`,
          tone: "warning",
        })),
    ];

    return {
      activeAssignments: enrichAssignments(data, activeAssignments),
      availableVehicles: data.vehicles.filter(
        (vehicle) =>
          vehicle.status === "Active" && !assignedVehicleIds.has(vehicle.id),
      ).length,
      dueSoonServices,
      managerProfile: data.managerProfiles.find(
        (profile) => profile.userId === userId,
      ),
      openWorkOrders: enrichMaintenance(
        data,
        data.maintenanceWorkOrders.filter(
          (record) =>
            record.status !== "completed" && record.status !== "cancelled",
        ),
      ),
      operationalAlerts,
      overdueServices,
      recentOperationalEvents: enrichActivity(
        data,
        data.auditEvents.filter((event) =>
          OPERATIONAL_ENTITY_TYPES.has(event.entityType),
        ),
      ).slice(0, 6),
      totalMaintenanceCost: data.maintenanceHistory.reduce(
        (total, record) => total + record.totalCost,
        0,
      ),
      totalVehicles: data.vehicles.length,
      unassignedVehicles: data.vehicles.filter(
        (vehicle) => !assignedVehicleIds.has(vehicle.id),
      ).length,
    };
  },

  getMechanicDashboard(data: FleetState, user: AuthUser) {
    const mechanicProfile = data.mechanicProfiles.find(
      (profile) => profile.userId === user.id,
    );
    const assignedWork = mechanicProfile
      ? enrichMaintenance(
          data,
          data.maintenanceWorkOrders.filter(
            (record) => record.assignedMechanicId === mechanicProfile.id,
          ),
        )
      : [];
    const recentServiceHistory = mechanicProfile
      ? byNewest(
          enrichHistory(
            data,
            data.maintenanceHistory.filter(
              (record) => record.mechanicId === mechanicProfile.id,
            ),
          ),
          (record) => record.serviceDate,
        ).slice(0, 6)
      : [];

    return {
      assignedWork,
      completedRecently: recentServiceHistory,
      inProgress: assignedWork.filter(
        (record) => record.status === "in_progress",
      ).length,
      mechanicProfile,
      notifications: getNotificationsForUser(data, user).slice(0, 6),
      openAssignedWork: assignedWork.filter(
        (record) =>
          record.status !== "completed" && record.status !== "cancelled",
      ),
      scheduled: assignedWork.filter(
        (record) =>
          record.status === "scheduled" || record.status === "assigned",
      ).length,
    };
  },

  getDriverDashboard(data: FleetState, user: AuthUser) {
    const driverProfile = data.driverProfiles.find(
      (profile) => profile.userId === user.id,
    );
    const activeAssignment = driverProfile
      ? data.assignments.find(
          (assignment) =>
            assignment.driverId === driverProfile.id &&
            assignment.status === "Active",
        )
      : undefined;
    const assignedVehicle = activeAssignment
      ? getVehicle(data, activeAssignment.vehicleId)
      : undefined;
    const recentSubmissions = driverProfile
      ? byNewest(
          enrichMileage(
            data,
            data.mileageLogs.filter(
              (submission) => submission.driverId === driverProfile.id,
            ),
          ),
          (submission) => submission.logDate,
        ).slice(0, 6)
      : [];
    const nextRequiredServices = assignedVehicle
      ? sortServiceMileage(
          enrichServiceMileage(
            data,
            mileageService.getVehicleServiceStatuses(data, assignedVehicle.id),
          ),
        )
      : [];
    const recentServiceHistory = assignedVehicle
      ? byNewest(
          enrichHistory(
            data,
            data.maintenanceHistory.filter(
              (record) => record.vehicleId === assignedVehicle.id,
            ),
          ),
          (record) => record.serviceDate,
        ).slice(0, 6)
      : [];

    return {
      activeAssignment,
      assignedVehicle,
      driverProfile,
      dueSoonServices: nextRequiredServices.filter(
        (item) => item.status === "DUE_SOON",
      ).length,
      latestMileageEntry: assignedVehicle
        ? mileageService.getLatestVehicleLog(data, assignedVehicle.id)
        : undefined,
      nextRequiredServices,
      notifications: getNotificationsForUser(data, user).slice(0, 6),
      overdueServices: nextRequiredServices.filter(
        (item) => item.status === "OVERDUE",
      ).length,
      recentServiceHistory,
      recentSubmissions,
    };
  },
};
