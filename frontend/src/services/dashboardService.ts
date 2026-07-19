import type { AuthUser } from "../types/auth";
import type {
  AuditEvent,
  MaintenanceHistoryRecord,
  MaintenanceSchedule,
  MaintenanceWorkOrder,
  MileageLog,
  Vehicle,
  VehicleAssignment,
  VehicleServiceMileageStatus,
} from "../types/fleet";
import { fleetDataService } from "./fleetDataService";
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

export interface ScheduleView extends MaintenanceSchedule {
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

function byNewest<T>(items: readonly T[], getDate: (item: T) => string) {
  return [...items].sort(
    (left, right) =>
      new Date(getDate(right)).getTime() - new Date(getDate(left)).getTime(),
  );
}

function getVehicle(vehicleId: string) {
  return fleetDataService
    .getSnapshot()
    .vehicles.find((vehicle) => vehicle.id === vehicleId);
}

function getUserName(userId: string) {
  return (
    fleetDataService.getSnapshot().users.find((user) => user.id === userId)
      ?.fullName ?? "Unknown user"
  );
}

function getDriverName(driverId: string) {
  const profile = fleetDataService
    .getSnapshot()
    .driverProfiles.find((driver) => driver.id === driverId);
  return profile ? getUserName(profile.userId) : "Unknown driver";
}

function enrichAssignments(assignments: readonly VehicleAssignment[]) {
  return assignments.flatMap<AssignmentView>((assignment) => {
    const vehicle = getVehicle(assignment.vehicleId);
    if (!vehicle) return [];
    return [
      {
        ...assignment,
        driverName: getDriverName(assignment.driverId),
        vehicle,
      },
    ];
  });
}

function enrichMaintenance(records: readonly MaintenanceWorkOrder[]) {
  const data = fleetDataService.getSnapshot();
  return records.flatMap<MaintenanceView>((record) => {
    const vehicle = getVehicle(record.vehicleId);
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
  data: ReturnType<typeof fleetDataService.getSnapshot>,
  statuses: readonly VehicleServiceMileageStatus[],
) {
  return statuses.flatMap<ServiceMileageView>((status) => {
    const vehicle = data.vehicles.find((item) => item.id === status.vehicleId);
    const serviceType = data.serviceTypes.find(
      (item) => item.id === status.serviceTypeId,
    );
    return vehicle && serviceType
      ? [{ ...status, service: serviceType.name, vehicle }]
      : [];
  });
}

function enrichHistory(records: readonly MaintenanceHistoryRecord[]) {
  return records.flatMap<ServiceHistoryView>((record) => {
    const vehicle = getVehicle(record.vehicleId);
    const serviceType = fleetDataService
      .getSnapshot()
      .serviceTypes.find((item) => item.id === record.serviceTypeId);
    return vehicle && serviceType
      ? [{ ...record, service: serviceType.name, vehicle }]
      : [];
  });
}

function enrichSchedules(schedules: readonly MaintenanceSchedule[]) {
  return schedules.flatMap<ScheduleView>((schedule) => {
    const vehicle = getVehicle(schedule.vehicleId);
    const serviceType = fleetDataService
      .getSnapshot()
      .serviceTypes.find((item) => item.id === schedule.serviceTypeId);
    return vehicle && serviceType
      ? [{ ...schedule, service: serviceType.name, vehicle }]
      : [];
  });
}

function enrichMileage(submissions: readonly MileageLog[]) {
  return submissions.flatMap<MileageView>((submission) => {
    const vehicle = getVehicle(submission.vehicleId);
    if (!vehicle) return [];
    return [
      {
        ...submission,
        driverName: getDriverName(submission.driverId),
        vehicle,
      },
    ];
  });
}

function getNotificationsForUser(user: AuthUser) {
  return sharedViewService.getNotifications(
    fleetDataService.getSnapshot(),
    user,
  );
}

export const dashboardService = {
  getNotificationsForUser,

  getAdminDashboard() {
    const data = fleetDataService.getSnapshot();
    const serviceStatuses = mileageService.getFleetServiceStatuses(data);
    const activeVehicles = data.vehicles.filter(
      (vehicle) => vehicle.status === "Active",
    ).length;
    const pendingWork = data.maintenanceWorkOrders.filter(
      (record) =>
        record.status !== "completed" && record.status !== "cancelled",
    ).length;
    const recentActivity: ActivityView[] = byNewest(
      data.auditEvents,
      (activity) => activity.createdAt,
    ).map((activity) => ({
      ...activity,
      actorName: getUserName(activity.userId),
    }));

    return {
      activeVehicles,
      maintenanceRecords:
        data.maintenanceWorkOrders.length + data.maintenanceHistory.length,
      pendingWork,
      recentActivity,
      serviceAttention: serviceStatuses.filter((item) =>
        ["DUE_SOON", "DUE_NOW", "OVERDUE"].includes(item.status),
      ).length,
      serviceHistoryGaps: serviceStatuses.filter(
        (item) => item.status === "NO_HISTORY",
      ).length,
      totalUsers: data.users.length,
      totalVehicles: data.vehicles.length,
    };
  },

  getManagerDashboard(userId: string) {
    const data = fleetDataService.getSnapshot();
    const managerProfile = data.managerProfiles.find(
      (profile) => profile.userId === userId,
    );
    const currentAssignments = enrichAssignments(
      data.assignments.filter((assignment) => assignment.status === "Active"),
    );
    const serviceMileageStatuses = enrichServiceMileage(
      data,
      mileageService.getFleetServiceStatuses(data),
    );
    const driverActivity = byNewest(
      enrichMileage(data.mileageLogs),
      (submission) => submission.logDate,
    );
    const recentSchedules = byNewest(
      enrichSchedules(data.maintenanceSchedules),
      (schedule) => schedule.createdAt,
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
      availableVehicles: data.vehicles.filter(
        (vehicle) => vehicle.status === "Active",
      ).length,
      currentAssignments,
      driverActivity,
      managerProfile,
      operationalAlerts,
      recentSchedules,
      serviceMileageStatuses,
      totalVehicles: data.vehicles.length,
    };
  },

  getMechanicDashboard(user: AuthUser) {
    const data = fleetDataService.getSnapshot();
    const mechanicProfile = data.mechanicProfiles.find(
      (profile) => profile.userId === user.id,
    );
    const assignedWork = mechanicProfile
      ? enrichMaintenance(
          data.maintenanceWorkOrders.filter(
            (record) => record.assignedMechanicId === mechanicProfile.id,
          ),
        )
      : [];
    const recentServiceHistory = mechanicProfile
      ? byNewest(
          enrichHistory(
            data.maintenanceHistory.filter(
              (record) => record.mechanicId === mechanicProfile.id,
            ),
          ),
          (record) => record.serviceDate,
        )
      : [];

    return {
      assignedWork,
      completedService: assignedWork.filter(
        (record) => record.status === "completed",
      ).length,
      inProgress: assignedWork.filter(
        (record) => record.status === "in_progress",
      ).length,
      mechanicProfile,
      notifications: getNotificationsForUser(user),
      pendingJobs: assignedWork.filter(
        (record) =>
          record.status === "assigned" || record.status === "scheduled",
      ).length,
      recentServiceHistory,
    };
  },

  getDriverDashboard(user: AuthUser) {
    const data = fleetDataService.getSnapshot();
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
      ? getVehicle(activeAssignment.vehicleId)
      : undefined;
    const recentSubmissions = driverProfile
      ? byNewest(
          enrichMileage(
            data.mileageLogs.filter(
              (submission) => submission.driverId === driverProfile.id,
            ),
          ),
          (submission) => submission.logDate,
        )
      : [];
    const maintenanceReminders = assignedVehicle
      ? enrichServiceMileage(
          data,
          mileageService.getVehicleServiceStatuses(data, assignedVehicle.id),
        )
      : [];

    return {
      activeAssignment,
      assignedVehicle,
      driverProfile,
      maintenanceReminders,
      notifications: getNotificationsForUser(user),
      recentSubmissions,
    };
  },
};
