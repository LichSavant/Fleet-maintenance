import { beforeEach, describe, expect, it } from "vitest";

import { reportService } from "./reportService";
import { fleetDataService } from "./fleetDataService";
import { sharedViewService } from "./sharedViewService";

describe("shared frontend features", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("accepts a valid increasing mileage reading", async () => {
    const entry = await fleetDataService.submitMileage(
      {
        odometerReading: 184500,
        notes: "End-of-shift reading",
        submissionDate: "2026-07-19",
      },
      "demo-user-driver",
    );
    const data = fleetDataService.getSnapshot();

    expect(entry.odometerReading).toBe(184500);
    expect(data.mileageLogs).toContainEqual(entry);
  });

  it("rejects a mileage reading lower than the current vehicle mileage", async () => {
    await expect(
      fleetDataService.submitMileage(
        {
          odometerReading: 184219,
          notes: "",
          submissionDate: "2026-07-19",
        },
        "demo-user-driver",
      ),
    ).rejects.toMatchObject({
      code: "invalid_mileage",
      message: expect.stringContaining("greater than 184,220 km"),
    });
  });

  it("rejects a mileage reading equal to the current vehicle mileage", async () => {
    await expect(
      fleetDataService.submitMileage(
        {
          odometerReading: 184220,
          notes: "",
          submissionDate: "2026-07-19",
        },
        "demo-user-driver",
      ),
    ).rejects.toMatchObject({ code: "invalid_mileage" });
  });

  it("rejects mileage submission without an active assignment", async () => {
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

  it("updates the assigned vehicle's current mileage", async () => {
    await fleetDataService.submitMileage(
      {
        odometerReading: 184500,
        notes: "End-of-shift reading",
        submissionDate: "2026-07-19",
      },
      "demo-user-driver",
    );
    const data = fleetDataService.getSnapshot();

    expect(
      data.vehicles.find((vehicle) => vehicle.id === "vehicle-axiom-2048")
        ?.currentMileage,
    ).toBe(184500);
  });

  it("resolves the mileage driver and vehicle from the signed-in user", async () => {
    const before = fleetDataService.getSnapshot();
    const user = before.users.find(
      (candidate) => candidate.email === "driver@forgefleet.demo",
    );
    const profile = before.driverProfiles.find(
      (candidate) => candidate.userId === user?.id,
    );
    const assignment = before.assignments.find(
      (candidate) =>
        candidate.driverId === profile?.id && candidate.status === "Active",
    );

    expect(user).toBeDefined();
    expect(profile).toBeDefined();
    expect(assignment).toBeDefined();
    const entry = await fleetDataService.submitMileage(
      {
        odometerReading: 184500,
        notes: "Resolved through the authenticated user",
        submissionDate: "2026-07-19",
      },
      user!.id,
    );

    expect(entry.driverId).toBe(profile!.id);
    expect(entry.vehicleId).toBe(assignment!.vehicleId);
  });

  it("creates an audit event for a mileage submission", async () => {
    const entry = await fleetDataService.submitMileage(
      {
        odometerReading: 184500,
        notes: "Audit verification",
        submissionDate: "2026-07-19",
      },
      "demo-user-driver",
    );
    const data = fleetDataService.getSnapshot();

    expect(data.auditEvents).toContainEqual(
      expect.objectContaining({
        action: "Submitted mileage",
        entityId: entry.id,
        entityType: "mileage_log",
        role: "driver",
        userId: "demo-user-driver",
      }),
    );
  });

  it("generates a due-service notification when mileage crosses a threshold", async () => {
    await fleetDataService.submitMileage(
      {
        odometerReading: 192000,
        notes: "Crossed the preventive-service due-soon threshold",
        submissionDate: "2026-07-19",
      },
      "demo-user-driver",
    );
    const data = fleetDataService.getSnapshot();

    expect(
      data.notifications.some(
        (notification) =>
          notification.userId === "demo-user-driver" &&
          notification.type === "Reminder" &&
          notification.title.includes("Preventive Maintenance A") &&
          notification.message.includes("193,000 km") &&
          notification.relatedRoute === "/driver/mileage" &&
          !notification.readAt,
      ),
    ).toBe(true);
  });

  it("rejects invalid mileage dates", async () => {
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
  });

  it("rejects mileage for an unavailable assigned vehicle", async () => {
    const vehicle = fleetDataService
      .getSnapshot()
      .vehicles.find((item) => item.id === "vehicle-axiom-2048");
    expect(vehicle).toBeDefined();
    const { id, ...vehicleInput } = vehicle!;
    await fleetDataService.updateVehicle(id, {
      ...vehicleInput,
      status: "Maintenance",
    });

    await expect(
      fleetDataService.submitMileage(
        {
          odometerReading: 184500,
          notes: "",
          submissionDate: "2026-07-19",
        },
        "demo-user-driver",
      ),
    ).rejects.toMatchObject({ code: "vehicle_unavailable" });
  });

  it("rejects non-finite, negative, and fractional odometer values", async () => {
    for (const odometerReading of [Number.NaN, -1, 184220.5]) {
      await expect(
        fleetDataService.submitMileage(
          {
            odometerReading,
            notes: "",
            submissionDate: "2026-07-19",
          },
          "demo-user-driver",
        ),
      ).rejects.toMatchObject({ code: "invalid_mileage" });
    }
  });

  it("prevents vehicle editing from bypassing mileage history", async () => {
    const vehicle = fleetDataService
      .getSnapshot()
      .vehicles.find((item) => item.id === "vehicle-axiom-2048");
    expect(vehicle).toBeDefined();
    const { id, ...vehicleInput } = vehicle!;

    await expect(
      fleetDataService.updateVehicle(id, {
        ...vehicleInput,
        currentMileage: vehicleInput.currentMileage + 1,
      }),
    ).rejects.toMatchObject({
      code: "invalid_record",
      message: expect.stringContaining("driver's mileage workflow"),
    });
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
          type: "Schedule",
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
    expect(
      reports.serviceDueSummary.reduce((total, item) => total + item.value, 0),
    ).toBe(reports.serviceMileageStatuses.length);
    expect(reports.serviceMileageStatuses).toHaveLength(
      data.vehicles.length *
        data.serviceTypes.filter((item) => item.status === "Active").length,
    );
  });
});
