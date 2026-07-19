import { beforeEach, describe, expect, it } from "vitest";

import { DEVELOPMENT_ACCOUNTS } from "../data/mockAccounts";
import { MOCK_FLEET_DATA } from "../data/mockFleetData";
import type { AuthUser, UserRole } from "../types/auth";
import { dashboardService } from "./dashboardService";

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

describe("dashboardService", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  it("derives administrator summaries from the central data source", () => {
    const dashboard = dashboardService.getAdminDashboard();

    expect(dashboard.totalUsers).toBe(MOCK_FLEET_DATA.users.length);
    expect(dashboard.totalVehicles).toBe(MOCK_FLEET_DATA.vehicles.length);
    expect(dashboard.activeVehicles).toBe(
      MOCK_FLEET_DATA.vehicles.filter((vehicle) => vehicle.status === "Active")
        .length,
    );
    expect(dashboard.pendingWork).toBe(
      MOCK_FLEET_DATA.maintenanceWorkOrders.filter(
        (record) =>
          record.status !== "completed" && record.status !== "cancelled",
      ).length,
    );
  });

  it("associates the manager dashboard with the signed-in manager", () => {
    const user = getDevelopmentUser("manager");
    const dashboard = dashboardService.getManagerDashboard(user.id);

    expect(dashboard.managerProfile?.userId).toBe(user.id);
    expect(dashboard.currentAssignments).toHaveLength(
      MOCK_FLEET_DATA.assignments.filter(
        (assignment) => assignment.status === "Active",
      ).length,
    );
  });

  it("limits mechanic work to the signed-in mechanic profile", () => {
    const user = getDevelopmentUser("mechanic");
    const dashboard = dashboardService.getMechanicDashboard(user);

    expect(dashboard.mechanicProfile?.userId).toBe(user.id);
    expect(dashboard.assignedWork.length).toBeGreaterThan(0);
    expect(
      dashboard.assignedWork.every(
        (record) => record.assignedMechanicId === dashboard.mechanicProfile?.id,
      ),
    ).toBe(true);
    expect(
      dashboard.assignedWork.some(
        (record) => record.assignedMechanicId === "mechanic-profile-ana",
      ),
    ).toBe(false);
  });

  it("limits vehicle and mileage records to the signed-in driver profile", () => {
    const user = getDevelopmentUser("driver");
    const dashboard = dashboardService.getDriverDashboard(user);

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
  });

  it("returns only notifications addressed to the account or its role", () => {
    const user = getDevelopmentUser("driver");
    const notifications = dashboardService.getNotificationsForUser(user);

    expect(notifications.length).toBeGreaterThan(0);
    expect(
      notifications.every((notification) => notification.userId === user.id),
    ).toBe(true);
  });
});
