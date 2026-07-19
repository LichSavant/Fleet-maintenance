import { beforeEach, describe, expect, it } from "vitest";

import { auditLogService } from "./auditLogService";
import { fleetDataService } from "./fleetDataService";
import { sharedViewService } from "./sharedViewService";

describe("frontend audit and notification workflows", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("records user, role-profile, and vehicle mutations with actor identity", async () => {
    const driver = await fleetDataService.createDriver(
      {
        email: "audit.driver@forgefleet.demo",
        employeeNumber: "DRV-9901",
        fullName: "Audit Driver",
        licenseNumber: "AUDIT-LICENSE-9901",
      },
      "demo-user-manager",
    );
    await fleetDataService.updateUser(
      driver.id,
      {
        email: driver.email,
        employeeNumber: "DRV-9901",
        fullName: "Audit Driver Updated",
        licenseNumber: "AUDIT-LICENSE-9901",
      },
      "demo-user-manager",
    );
    await fleetDataService.deactivateUser(driver.id, "demo-user-manager");

    const vehicle = await fleetDataService.createVehicle(
      {
        currentMileage: 100,
        fleetNumber: "AUD-9901",
        make: "Forge Motors",
        model: "Audit Runner",
        plateNumber: "AUD 9901",
        status: "Active",
        type: "Service Van",
        vin: "AUDITVIN0000009901",
        year: 2026,
      },
      "demo-user-manager",
    );
    await fleetDataService.updateVehicle(
      vehicle.id,
      { ...vehicle, status: "Maintenance" },
      "demo-user-manager",
    );
    await fleetDataService.deactivateVehicle(vehicle.id, "demo-user-manager");

    const events = fleetDataService.getSnapshot().auditEvents;
    for (const action of [
      "Created user",
      "Created driver profile",
      "Updated user",
      "Deactivated user",
      "Created vehicle",
      "Updated vehicle",
      "Deactivated vehicle",
    ]) {
      expect(events).toContainEqual(
        expect.objectContaining({
          action,
          role: "manager",
          userDisplayName: "Maria Santos",
          userId: "demo-user-manager",
        }),
      );
    }
  });

  it("records authentication actions with the required audit fields", () => {
    fleetDataService.recordAuthenticationEvent("demo-user-driver", "Signed in");
    fleetDataService.recordAuthenticationEvent(
      "demo-user-driver",
      "Signed out",
    );

    const events = fleetDataService
      .getSnapshot()
      .auditEvents.filter((event) => event.userId === "demo-user-driver");
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "Signed in",
          createdAt: expect.any(String),
          description: expect.stringContaining("frontend demonstration"),
          entityId: "demo-user-driver",
          entityType: "user",
          role: "driver",
          userDisplayName: "Carlo Reyes",
        }),
        expect.objectContaining({
          action: "Signed out",
          userDisplayName: "Carlo Reyes",
        }),
      ]),
    );
  });

  it("notifies a driver when an assignment starts and ends", async () => {
    const assignment = await fleetDataService.createAssignment(
      {
        driverId: "driver-profile-maya",
        startDate: "2026-07-19",
        vehicleId: "vehicle-nova-7710",
      },
      "demo-user-manager",
    );
    await fleetDataService.endAssignment(
      assignment.id,
      "2026-07-19",
      "demo-user-manager",
    );

    const data = fleetDataService.getSnapshot();
    const notifications = data.notifications.filter(
      (notification) => notification.userId === "fleet-user-driver-maya",
    );
    expect(notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          relatedRoute: "/driver/dashboard",
          title: "New vehicle assignment",
        }),
        expect.objectContaining({
          relatedRoute: "/driver/dashboard",
          title: "Vehicle assignment ended",
        }),
      ]),
    );
    expect(data.auditEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "Created vehicle assignment",
          entityId: assignment.id,
        }),
        expect.objectContaining({
          action: "Ended vehicle assignment",
          entityId: assignment.id,
        }),
      ]),
    );
  });

  it("notifies relevant accounts when a vehicle enters and leaves maintenance", async () => {
    const before = fleetDataService
      .getSnapshot()
      .vehicles.find((vehicle) => vehicle.id === "vehicle-nova-7710");
    expect(before).toBeDefined();

    await fleetDataService.updateVehicle(
      before!.id,
      { ...before!, status: "Maintenance" },
      "demo-user-manager",
    );
    const maintenanceVehicle = fleetDataService
      .getSnapshot()
      .vehicles.find((vehicle) => vehicle.id === before!.id)!;
    await fleetDataService.updateVehicle(
      maintenanceVehicle.id,
      { ...maintenanceVehicle, status: "Active" },
      "demo-user-manager",
    );

    const notifications = fleetDataService.getSnapshot().notifications;
    expect(notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          relatedRoute: "/management/vehicles",
          title: "Vehicle under maintenance",
          userId: "demo-user-admin",
        }),
        expect.objectContaining({
          relatedRoute: "/management/vehicles",
          title: "Vehicle available",
          userId: "demo-user-manager",
        }),
      ]),
    );
  });

  it("audits work assignment, start, and completion and notifies the mechanic", async () => {
    await fleetDataService.assignWorkOrder(
      "maintenance-obsidian-brakes",
      "mechanic-profile-ana",
      "demo-user-manager",
    );
    await fleetDataService.transitionWorkOrder("maintenance-obsidian-brakes", {
      actorUserId: "fleet-user-mechanic-ana",
      status: "in_progress",
    });
    await fleetDataService.transitionWorkOrder("maintenance-obsidian-brakes", {
      actorUserId: "fleet-user-mechanic-ana",
      odometerAtService: 211100,
      serviceNotes: "Brake pressure restored and verified.",
      status: "completed",
      totalCost: 3200,
    });

    const data = fleetDataService.getSnapshot();
    expect(data.auditEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "Assigned maintenance work order",
          entityId: "maintenance-obsidian-brakes",
          userId: "demo-user-manager",
        }),
        expect.objectContaining({
          action: "Started maintenance work",
          entityId: "maintenance-obsidian-brakes",
          userId: "fleet-user-mechanic-ana",
        }),
        expect.objectContaining({
          action: "Completed maintenance work",
          entityId: "maintenance-obsidian-brakes",
          userId: "fleet-user-mechanic-ana",
        }),
      ]),
    );
    expect(data.notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          relatedRoute: "/maintenance/work-orders",
          title: "Work order assigned",
          userId: "fleet-user-mechanic-ana",
        }),
        expect.objectContaining({
          relatedRoute: "/maintenance/history",
          title: "Vehicle maintenance completed",
          userId: "fleet-user-mechanic-ana",
        }),
      ]),
    );
  });

  it("calculates unread counts and supports one/all read actions", async () => {
    const user = {
      email: "driver@forgefleet.demo",
      fullName: "Carlo Reyes",
      id: "demo-user-driver",
      role: "driver" as const,
    };
    let notifications = sharedViewService.getNotifications(
      fleetDataService.getSnapshot(),
      user,
    );
    const initialUnread =
      sharedViewService.getUnreadNotificationCount(notifications);
    const unread = notifications.find((notification) => !notification.readAt);
    expect(unread).toBeDefined();

    await fleetDataService.markNotificationRead(unread!.id, user.id);
    notifications = sharedViewService.getNotifications(
      fleetDataService.getSnapshot(),
      user,
    );
    expect(sharedViewService.getUnreadNotificationCount(notifications)).toBe(
      initialUnread - 1,
    );

    await fleetDataService.markAllNotificationsRead(user.id);
    notifications = sharedViewService.getNotifications(
      fleetDataService.getSnapshot(),
      user,
    );
    expect(sharedViewService.getUnreadNotificationCount(notifications)).toBe(0);
  });

  it("does not repeat a mileage threshold notification while status is unchanged", async () => {
    await fleetDataService.submitMileage(
      {
        odometerReading: 192000,
        notes: "Entered the due-soon threshold.",
        submissionDate: "2026-07-19",
      },
      "demo-user-driver",
    );
    const afterCrossing = fleetDataService
      .getSnapshot()
      .notifications.filter(
        (notification) =>
          notification.type === "Reminder" &&
          notification.title.includes("Preventive Maintenance A"),
      ).length;

    await fleetDataService.submitMileage(
      {
        odometerReading: 192100,
        notes: "Still inside the same due-soon threshold.",
        submissionDate: "2026-07-19",
      },
      "demo-user-driver",
    );
    const afterSameStatus = fleetDataService
      .getSnapshot()
      .notifications.filter(
        (notification) =>
          notification.type === "Reminder" &&
          notification.title.includes("Preventive Maintenance A"),
      ).length;

    expect(afterCrossing).toBeGreaterThan(0);
    expect(afterSameStatus).toBe(afterCrossing);
  });

  it.each([
    [193000, "DUE NOW"],
    [193001, "OVERDUE"],
  ])("notifies when service becomes %s km / %s", async (odometer, status) => {
    await fleetDataService.submitMileage(
      {
        odometerReading: odometer,
        notes: `Threshold test for ${status}.`,
        submissionDate: "2026-07-19",
      },
      "demo-user-driver",
    );

    const notices = fleetDataService
      .getSnapshot()
      .notifications.filter(
        (notification) =>
          notification.type === "Reminder" &&
          notification.title === `Preventive Maintenance A: ${status}`,
      );
    expect(notices.map((notification) => notification.userId)).toEqual(
      expect.arrayContaining([
        "demo-user-admin",
        "demo-user-manager",
        "demo-user-driver",
      ]),
    );
    expect(
      notices.every((notification) =>
        ["/reports", "/driver/mileage"].includes(notification.relatedRoute),
      ),
    ).toBe(true);
  });

  it("allows only administrators to view the audit log", () => {
    expect(auditLogService.canView("admin")).toBe(true);
    expect(auditLogService.canView("manager")).toBe(false);
    expect(auditLogService.canView("mechanic")).toBe(false);
    expect(auditLogService.canView("driver")).toBe(false);
  });
});
