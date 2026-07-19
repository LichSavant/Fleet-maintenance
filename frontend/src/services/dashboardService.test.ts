import { beforeEach, describe, expect, it } from "vitest";

import { DEVELOPMENT_ACCOUNTS } from "../data/mockAccounts";
import type { AuthUser, UserRole } from "../types/auth";
import { dashboardService } from "./dashboardService";
import { fleetDataService } from "./fleetDataService";
import { mileageService } from "./mileageService";

function getDevelopmentUser(role: UserRole): AuthUser {
  const account = DEVELOPMENT_ACCOUNTS.find((item) => item.role === role);
  if (!account) throw new Error(`Missing ${role} development account.`);

  return {
    email: account.email,
    fullName: account.fullName,
    id: account.id,
    role: account.role,
  };
}

function toAuthUser(user: {
  email: string;
  fullName: string;
  id: string;
  role: UserRole;
}): AuthUser {
  return {
    email: user.email,
    fullName: user.fullName,
    id: user.id,
    role: user.role,
  };
}

describe("dashboardService", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("derives every administrator summary and audit item from the supplied state", () => {
    const data = fleetDataService.getSnapshot();
    const activeAssignments = data.assignments.filter(
      (assignment) => assignment.status === "Active",
    );
    const assignedVehicleIds = new Set(
      activeAssignments.map((assignment) => assignment.vehicleId),
    );
    const statuses = mileageService.getFleetServiceStatuses(data);
    const dashboard = dashboardService.getAdminDashboard(data);

    expect(dashboard).toMatchObject({
      activeUsers: data.users.filter((user) => user.status === "Active").length,
      assignedVehicles: assignedVehicleIds.size,
      availableVehicles: data.vehicles.filter(
        (vehicle) =>
          vehicle.status === "Active" && !assignedVehicleIds.has(vehicle.id),
      ).length,
      dueSoonServices: statuses.filter((item) => item.status === "DUE_SOON")
        .length,
      overdueServices: statuses.filter((item) => item.status === "OVERDUE")
        .length,
      totalUsers: data.users.length,
      totalVehicles: data.vehicles.length,
      underMaintenanceVehicles: data.vehicles.filter(
        (vehicle) => vehicle.status === "Maintenance",
      ).length,
    });
    expect(dashboard.recentActivity.length).toBeLessThanOrEqual(6);
    expect(
      dashboard.recentActivity.every((event) =>
        data.auditEvents.some((source) => source.id === event.id),
      ),
    ).toBe(true);
  });

  it("derives manager operations, open work, and recorded cost from current records", () => {
    const data = fleetDataService.getSnapshot();
    const user = getDevelopmentUser("manager");
    const dashboard = dashboardService.getManagerDashboard(data, user.id);
    const activeAssignments = data.assignments.filter(
      (assignment) => assignment.status === "Active",
    );
    const assignedVehicleIds = new Set(
      activeAssignments.map((assignment) => assignment.vehicleId),
    );

    expect(dashboard.managerProfile?.userId).toBe(user.id);
    expect(dashboard.activeAssignments).toHaveLength(activeAssignments.length);
    expect(dashboard.availableVehicles).toBe(
      data.vehicles.filter(
        (vehicle) =>
          vehicle.status === "Active" && !assignedVehicleIds.has(vehicle.id),
      ).length,
    );
    expect(dashboard.unassignedVehicles).toBe(
      data.vehicles.filter((vehicle) => !assignedVehicleIds.has(vehicle.id))
        .length,
    );
    expect(dashboard.openWorkOrders).toHaveLength(
      data.maintenanceWorkOrders.filter(
        (record) =>
          record.status !== "completed" && record.status !== "cancelled",
      ).length,
    );
    expect(dashboard.totalMaintenanceCost).toBe(
      data.maintenanceHistory.reduce(
        (total, record) => total + record.totalCost,
        0,
      ),
    );
    expect(
      dashboard.recentOperationalEvents.every((event) =>
        data.auditEvents.some((source) => source.id === event.id),
      ),
    ).toBe(true);
  });

  it("limits mechanic work, history, and notifications to the session profile", () => {
    const data = fleetDataService.getSnapshot();
    const user = getDevelopmentUser("mechanic");
    const dashboard = dashboardService.getMechanicDashboard(data, user);

    expect(dashboard.mechanicProfile?.userId).toBe(user.id);
    expect(
      dashboard.assignedWork.every(
        (record) => record.assignedMechanicId === dashboard.mechanicProfile?.id,
      ),
    ).toBe(true);
    expect(
      dashboard.completedRecently.every(
        (record) => record.mechanicId === dashboard.mechanicProfile?.id,
      ),
    ).toBe(true);
    expect(
      dashboard.notifications.every(
        (notification) => notification.userId === user.id,
      ),
    ).toBe(true);
    expect(dashboard.scheduled).toBe(
      dashboard.assignedWork.filter(
        (record) =>
          record.status === "scheduled" || record.status === "assigned",
      ).length,
    );
  });

  it("resolves a second mechanic independently instead of assuming one profile ID", () => {
    const data = fleetDataService.getSnapshot();
    const primaryUser = getDevelopmentUser("mechanic");
    const alternateProfile = data.mechanicProfiles.find(
      (profile) => profile.userId !== primaryUser.id,
    );
    const alternateUser = data.users.find(
      (user) => user.id === alternateProfile?.userId,
    );
    if (!alternateProfile || !alternateUser) {
      throw new Error("Missing alternate mechanic fixture.");
    }

    const dashboard = dashboardService.getMechanicDashboard(
      data,
      toAuthUser(alternateUser),
    );

    expect(dashboard.mechanicProfile?.id).toBe(alternateProfile.id);
    expect(
      dashboard.assignedWork.every(
        (record) => record.assignedMechanicId === alternateProfile.id,
      ),
    ).toBe(true);
    expect(
      dashboard.assignedWork.some(
        (record) => record.assignedMechanicId !== dashboard.mechanicProfile?.id,
      ),
    ).toBe(false);
  });

  it("limits the driver vehicle, mileage, service, history, and notifications by session user", () => {
    const data = fleetDataService.getSnapshot();
    const user = getDevelopmentUser("driver");
    const dashboard = dashboardService.getDriverDashboard(data, user);

    expect(dashboard.driverProfile?.userId).toBe(user.id);
    expect(dashboard.activeAssignment?.driverId).toBe(
      dashboard.driverProfile?.id,
    );
    expect(dashboard.assignedVehicle?.id).toBe(
      dashboard.activeAssignment?.vehicleId,
    );
    expect(
      dashboard.recentSubmissions.every(
        (submission) => submission.driverId === dashboard.driverProfile?.id,
      ),
    ).toBe(true);
    expect(
      dashboard.nextRequiredServices.every(
        (item) => item.vehicleId === dashboard.assignedVehicle?.id,
      ),
    ).toBe(true);
    expect(
      dashboard.recentServiceHistory.every(
        (item) => item.vehicleId === dashboard.assignedVehicle?.id,
      ),
    ).toBe(true);
    expect(
      dashboard.notifications.every(
        (notification) => notification.userId === user.id,
      ),
    ).toBe(true);
    expect(dashboard.latestMileageEntry?.vehicleId).toBe(
      dashboard.assignedVehicle?.id,
    );
  });

  it("reflects CRUD mutations when selectors receive the latest centralized state", async () => {
    const manager = getDevelopmentUser("manager");
    const before = dashboardService.getManagerDashboard(
      fleetDataService.getSnapshot(),
      manager.id,
    );
    const availableDriver = fleetDataService
      .getSnapshot()
      .driverProfiles.find((profile) => profile.status === "Available");
    const assignedIds = new Set(
      fleetDataService
        .getSnapshot()
        .assignments.filter((assignment) => assignment.status === "Active")
        .map((assignment) => assignment.vehicleId),
    );
    const availableVehicle = fleetDataService
      .getSnapshot()
      .vehicles.find(
        (vehicle) =>
          vehicle.status === "Active" && !assignedIds.has(vehicle.id),
      );
    if (!availableDriver || !availableVehicle) {
      throw new Error("Missing assignable dashboard fixtures.");
    }

    await fleetDataService.createAssignment(
      {
        driverId: availableDriver.id,
        startDate: "2026-07-19",
        vehicleId: availableVehicle.id,
      },
      manager.id,
    );
    const after = dashboardService.getManagerDashboard(
      fleetDataService.getSnapshot(),
      manager.id,
    );
    const driverUser = fleetDataService
      .getSnapshot()
      .users.find((user) => user.id === availableDriver.userId);
    if (!driverUser) throw new Error("Missing linked driver user.");
    const driverDashboard = dashboardService.getDriverDashboard(
      fleetDataService.getSnapshot(),
      toAuthUser(driverUser),
    );

    expect(after.activeAssignments).toHaveLength(
      before.activeAssignments.length + 1,
    );
    expect(after.availableVehicles).toBe(before.availableVehicles - 1);
    expect(driverDashboard.assignedVehicle?.id).toBe(availableVehicle.id);
  });
});
