import type { AuthUser } from "../types/auth";
import type {
  MaintenanceRecord,
  MaintenanceSchedule,
  MileageSubmission,
  SystemActivity,
  Vehicle,
  VehicleAssignment,
} from "../types/fleet";
import { fleetDataService } from "./fleetDataService";
import { sharedViewService } from "./sharedViewService";

export interface ActivityView extends SystemActivity {
  actorName: string;
}

export interface AssignmentView extends VehicleAssignment {
  driverName: string;
  vehicle: Vehicle;
}

export interface MaintenanceView extends MaintenanceRecord {
  service: string;
  vehicle: Vehicle;
}

export interface ScheduleView extends MaintenanceSchedule {
  service: string;
  vehicle: Vehicle;
}

export interface MileageView extends MileageSubmission {
  driverName: string;
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

function getDriverName(driverProfileId: string) {
  const profile = fleetDataService
    .getSnapshot()
    .driverProfiles.find((driver) => driver.id === driverProfileId);
  return profile ? getUserName(profile.userId) : "Unknown driver";
}

function enrichAssignments(assignments: readonly VehicleAssignment[]) {
  return assignments.flatMap<AssignmentView>((assignment) => {
    const vehicle = getVehicle(assignment.vehicleId);
    if (!vehicle) return [];
    return [
      {
        ...assignment,
        driverName: getDriverName(assignment.driverProfileId),
        vehicle,
      },
    ];
  });
}

function enrichMaintenance(records: readonly MaintenanceRecord[]) {
  return records.flatMap<MaintenanceView>((record) => {
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

function enrichMileage(submissions: readonly MileageSubmission[]) {
  return submissions.flatMap<MileageView>((submission) => {
    const vehicle = getVehicle(submission.vehicleId);
    if (!vehicle) return [];
    return [
      {
        ...submission,
        driverName: getDriverName(submission.driverProfileId),
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
    const activeVehicles = data.vehicles.filter(
      (vehicle) => vehicle.status === "Active",
    ).length;
    const pendingWork = data.maintenanceRecords.filter(
      (record) =>
        record.status !== "completed" && record.status !== "cancelled",
    ).length;
    const recentActivity: ActivityView[] = byNewest(
      data.systemActivity,
      (activity) => activity.occurredAt,
    ).map((activity) => ({
      ...activity,
      actorName: getUserName(activity.userId),
    }));

    return {
      activeVehicles,
      maintenanceRecords: data.maintenanceRecords.length,
      pendingWork,
      recentActivity,
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
    const upcomingMaintenance = enrichSchedules(
      data.maintenanceSchedules.filter(
        (schedule) =>
          schedule.status !== "Converted" && schedule.status !== "Cancelled",
      ),
    ).sort(
      (left, right) =>
        new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime(),
    );
    const driverActivity = byNewest(
      enrichMileage(data.mileageSubmissions),
      (submission) => submission.submittedAt,
    );
    const recentSchedules = byNewest(
      enrichSchedules(data.maintenanceSchedules),
      (schedule) => schedule.createdAt,
    );
    const operationalAlerts: OperationalAlert[] = [
      ...data.maintenanceSchedules
        .filter((schedule) => schedule.status === "Overdue")
        .flatMap<OperationalAlert>((schedule) => {
          const vehicle = getVehicle(schedule.vehicleId);
          const serviceType = data.serviceTypes.find(
            (item) => item.id === schedule.serviceTypeId,
          );
          return vehicle && serviceType
            ? [
                {
                  description: `${vehicle.plate} · due ${schedule.dueDate}`,
                  id: `alert-${schedule.id}`,
                  title: serviceType.name,
                  tone: "danger",
                },
              ]
            : [];
        }),
      ...data.vehicles
        .filter((vehicle) => vehicle.status === "Out of Service")
        .map<OperationalAlert>((vehicle) => ({
          description: `${vehicle.model} requires operational review.`,
          id: `alert-${vehicle.id}`,
          title: `${vehicle.plate} is out of service`,
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
      totalVehicles: data.vehicles.length,
      upcomingMaintenance,
    };
  },

  getMechanicDashboard(user: AuthUser) {
    const data = fleetDataService.getSnapshot();
    const mechanicProfile = data.mechanicProfiles.find(
      (profile) => profile.userId === user.id,
    );
    const assignedWork = mechanicProfile
      ? enrichMaintenance(
          data.maintenanceRecords.filter(
            (record) => record.mechanicProfileId === mechanicProfile.id,
          ),
        )
      : [];
    const recentServiceHistory = byNewest(
      assignedWork.filter(
        (record): record is MaintenanceView & { completedDate: string } =>
          record.status === "completed" && Boolean(record.completedDate),
      ),
      (record) => record.completedDate,
    );

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
            assignment.driverProfileId === driverProfile.id &&
            assignment.status === "Active",
        )
      : undefined;
    const assignedVehicle = activeAssignment
      ? getVehicle(activeAssignment.vehicleId)
      : undefined;
    const recentSubmissions = driverProfile
      ? byNewest(
          enrichMileage(
            data.mileageSubmissions.filter(
              (submission) => submission.driverProfileId === driverProfile.id,
            ),
          ),
          (submission) => submission.submittedAt,
        )
      : [];
    const maintenanceReminders = assignedVehicle
      ? enrichSchedules(
          data.maintenanceSchedules.filter(
            (schedule) =>
              schedule.vehicleId === assignedVehicle.id &&
              schedule.status !== "Converted" &&
              schedule.status !== "Cancelled",
          ),
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
