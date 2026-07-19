import { beforeEach, describe, expect, it } from "vitest";

import { reportService } from "./reportService";
import { fleetDataService } from "./fleetDataService";
import { sharedViewService } from "./sharedViewService";

describe("shared frontend features", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("associates mileage with the signed-in driver and assigned vehicle", async () => {
    const entry = await fleetDataService.submitMileage(
      {
        odometerReading: 184500,
        notes: "End-of-shift reading",
        submissionDate: "2026-07-19",
      },
      "demo-user-driver",
    );
    const data = fleetDataService.getSnapshot();

    expect(entry).toMatchObject({
      driverId: "driver-profile-carlo",
      odometerReading: 184500,
      vehicleId: "vehicle-axiom-2048",
    });
    expect(
      data.vehicles.find((vehicle) => vehicle.id === "vehicle-axiom-2048")
        ?.currentMileage,
    ).toBe(184500);
    expect(
      data.notifications.some(
        (notification) =>
          notification.userId === "demo-user-driver" &&
          notification.type === "Mileage" &&
          !notification.readAt,
      ),
    ).toBe(true);
  });

  it("rejects lower odometers, invalid dates, and drivers without assignments", async () => {
    await expect(
      fleetDataService.submitMileage(
        {
          odometerReading: 184219,
          notes: "",
          submissionDate: "2026-07-19",
        },
        "demo-user-driver",
      ),
    ).rejects.toMatchObject({ code: "invalid_mileage" });

    await expect(
      fleetDataService.submitMileage(
        {
          odometerReading: 184500,
          notes: "",
          submissionDate: "2026-07-13",
        },
        "demo-user-driver",
      ),
    ).rejects.toMatchObject({ code: "invalid_date" });

    await expect(
      fleetDataService.submitMileage(
        {
          odometerReading: 50000,
          notes: "",
          submissionDate: "2026-07-19",
        },
        "fleet-user-driver-maya",
      ),
    ).rejects.toMatchObject({ code: "no_assignment" });
  });

  it("generates notifications from assignments, schedules, and maintenance completion", async () => {
    await fleetDataService.createAssignment(
      {
        driverId: "driver-profile-maya",
        startDate: "2026-07-19",
        vehicleId: "vehicle-nova-7710",
      },
      "demo-user-manager",
    );
    await fleetDataService.createMaintenanceSchedule(
      {
        dueDate: "2026-08-20",
        assignedMechanicId: "mechanic-profile-noel",
        notes: "Plan the service bay.",
        serviceTypeId: "service-type-brakes",
        vehicleId: "vehicle-axiom-2048",
      },
      "demo-user-manager",
    );
    await fleetDataService.transitionWorkOrder("maintenance-nova-safety", {
      actorUserId: "demo-user-manager",
      status: "in_progress",
    });
    await fleetDataService.transitionWorkOrder("maintenance-nova-safety", {
      actorUserId: "demo-user-manager",
      serviceNotes: "Inspection completed and verified.",
      status: "completed",
    });
    const notifications = fleetDataService.getSnapshot().notifications;

    expect(notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "Assignment",
          userId: "fleet-user-driver-maya",
        }),
        expect.objectContaining({
          type: "Reminder",
          userId: "demo-user-driver",
        }),
        expect.objectContaining({
          type: "Schedule",
          userId: "demo-user-mechanic",
        }),
        expect.objectContaining({
          type: "Maintenance",
          userId: "fleet-user-driver-maya",
        }),
      ]),
    );
  });

  it("marks only notifications belonging to the current account", async () => {
    await fleetDataService.markNotificationRead(
      "notification-carlo-service",
      "demo-user-driver",
    );
    await expect(
      fleetDataService.markNotificationRead(
        "notification-noel-priority",
        "demo-user-driver",
      ),
    ).rejects.toMatchObject({ code: "unauthorized" });
    await fleetDataService.markAllNotificationsRead("demo-user-driver");
    const data = fleetDataService.getSnapshot();
    const driverNotifications = sharedViewService.getNotifications(data, {
      email: "driver@forgefleet.demo",
      fullName: "Carlo Reyes",
      id: "demo-user-driver",
      role: "driver",
    });

    expect(
      driverNotifications.every((notification) => notification.readAt),
    ).toBe(true);
    expect(
      data.notifications.find(
        (notification) => notification.id === "notification-noel-priority",
      )?.readAt,
    ).toBeNull();
  });

  it("updates only editable profile fields and rejects duplicate emails", async () => {
    const updated = await fleetDataService.updateOwnProfile(
      "demo-user-driver",
      {
        email: "carlo.updated@forgefleet.demo",
        fullName: "Carlo Reyes Updated",
      },
    );

    expect(updated).toMatchObject({
      email: "carlo.updated@forgefleet.demo",
      fullName: "Carlo Reyes Updated",
      id: "demo-user-driver",
      role: "driver",
      status: "Active",
    });
    await expect(
      fleetDataService.updateOwnProfile("demo-user-driver", {
        email: "manager@forgefleet.demo",
        fullName: "Carlo Reyes Updated",
      }),
    ).rejects.toMatchObject({ code: "duplicate_email" });
  });

  it("calculates all report sections from the centralized records", () => {
    const data = fleetDataService.getSnapshot();
    const reports = reportService.getReports(data);

    expect(
      reports.vehicleStatus.reduce((total, item) => total + item.value, 0),
    ).toBe(data.vehicles.length);
    expect(
      reports.maintenanceStatus.reduce((total, item) => total + item.value, 0),
    ).toBe(data.maintenanceWorkOrders.length);
    expect(
      reports.assignmentSummary.reduce((total, item) => total + item.value, 0),
    ).toBe(data.assignments.length);
    expect(
      reports.userRoleSummary.reduce((total, item) => total + item.value, 0),
    ).toBe(data.users.length);
    expect(reports.mileageSummary).toContainEqual({
      label: "Submissions",
      value: data.mileageLogs.length,
    });
  });
});
