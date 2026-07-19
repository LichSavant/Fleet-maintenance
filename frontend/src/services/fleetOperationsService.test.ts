import { beforeEach, describe, expect, it } from "vitest";

import { operationsViewService } from "./operationsViewService";
import { fleetDataService } from "./fleetDataService";
import { mileageService } from "./mileageService";

describe("fleet operational workflows", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("creates a valid assignment and updates the linked driver state", async () => {
    const assignment = await fleetDataService.createAssignment(
      {
        driverId: "driver-profile-maya",
        startDate: "2026-07-19",
        vehicleId: "vehicle-nova-7710",
      },
      "demo-user-manager",
    );
    const data = fleetDataService.getSnapshot();

    expect(assignment.status).toBe("Active");
    expect(
      data.driverProfiles.find(
        (profile) => profile.id === "driver-profile-maya",
      )?.status,
    ).toBe("Assigned");
  });

  it("rejects driver and vehicle conflicts for active assignments", async () => {
    const user = await fleetDataService.createDriver({
      email: "conflict.driver@forgefleet.demo",
      fullName: "Conflict Driver",
      licenseNumber: "N09-26-000111",
    });
    const profile = fleetDataService
      .getSnapshot()
      .driverProfiles.find((item) => item.userId === user.id);

    await expect(
      fleetDataService.createAssignment(
        {
          driverId: profile?.id ?? "",
          startDate: "2026-07-19",
          vehicleId: "vehicle-axiom-2048",
        },
        "demo-user-manager",
      ),
    ).rejects.toMatchObject({ code: "assignment_conflict" });

    await expect(
      fleetDataService.createAssignment(
        {
          driverId: "driver-profile-carlo",
          startDate: "2026-07-19",
          vehicleId: "vehicle-nova-7710",
        },
        "demo-user-manager",
      ),
    ).rejects.toMatchObject({ code: "ineligible_driver" });
  });

  it("ends an assignment while retaining history and restoring availability", async () => {
    await fleetDataService.endAssignment(
      "assignment-axiom-carlo",
      "2026-07-19",
      "demo-user-manager",
    );
    const data = fleetDataService.getSnapshot();

    expect(
      data.assignments.find((item) => item.id === "assignment-axiom-carlo"),
    ).toMatchObject({ endDate: "2026-07-19", status: "Ended" });
    expect(
      data.driverProfiles.find((item) => item.id === "driver-profile-carlo")
        ?.status,
    ).toBe("Available");
    expect(operationsViewService.getAssignments(data)).toHaveLength(
      data.assignments.length,
    );
  });

  it("creates a schedule and converts it to one linked work order", async () => {
    const schedule = await fleetDataService.createMaintenanceSchedule(
      {
        dueDate: "2026-08-20",
        assignedMechanicId: "mechanic-profile-noel",
        notes: "Prepare inspection bay.",
        serviceTypeId: "service-type-brakes",
        vehicleId: "vehicle-axiom-2048",
      },
      "demo-user-manager",
    );
    const workOrder = await fleetDataService.createWorkOrder(
      {
        assignedMechanicId: "mechanic-profile-noel",
        notes: schedule.notes,
        priority: "Medium",
        scheduleId: schedule.id,
        scheduledDate: schedule.dueDate,
        serviceTypeId: schedule.serviceTypeId,
        vehicleId: schedule.vehicleId,
      },
      "demo-user-manager",
    );
    const linkedSchedule = fleetDataService
      .getSnapshot()
      .maintenanceSchedules.find((item) => item.id === schedule.id);

    expect(linkedSchedule).toMatchObject({
      status: "Converted",
      workOrderId: workOrder.id,
    });
    await expect(
      fleetDataService.createWorkOrder(
        {
          notes: schedule.notes,
          priority: "Medium",
          scheduleId: schedule.id,
          scheduledDate: schedule.dueDate,
          serviceTypeId: schedule.serviceTypeId,
          vehicleId: schedule.vehicleId,
        },
        "demo-user-manager",
      ),
    ).rejects.toMatchObject({ code: "invalid_record" });
  });

  it("supports the assigned mechanic workflow and derives service history", async () => {
    await fleetDataService.transitionWorkOrder("maintenance-obsidian-brakes", {
      actorUserId: "demo-user-mechanic",
      status: "in_progress",
    });
    await fleetDataService.updateWorkOrderServiceNotes(
      "maintenance-obsidian-brakes",
      "Pressure regulator replaced and system bled.",
      "demo-user-mechanic",
    );
    await fleetDataService.transitionWorkOrder("maintenance-obsidian-brakes", {
      actorUserId: "demo-user-mechanic",
      odometerAtService: 211240,
      serviceNotes:
        "Pressure regulator replaced and braking pressure verified.",
      status: "completed",
      totalCost: 4850.5,
    });
    const data = fleetDataService.getSnapshot();
    const completed = data.maintenanceWorkOrders.find(
      (item) => item.id === "maintenance-obsidian-brakes",
    );

    expect(completed).toMatchObject({ status: "completed" });
    const history = data.maintenanceHistory.find(
      (record) => record.workOrderId === completed?.id,
    );
    expect(history).toMatchObject({
      mechanicId: "mechanic-profile-noel",
      odometerAtService: 211240,
      totalCost: 4850.5,
      vehicleId: "vehicle-obsidian-3990",
    });
    expect(
      operationsViewService
        .getServiceHistory(data)
        .some(({ history: record }) => record.workOrderId === completed?.id),
    ).toBe(true);
    expect(
      data.auditEvents.some(
        (event) =>
          event.entityType === "maintenance_history" &&
          event.entityId === history?.id &&
          event.userId === "demo-user-mechanic",
      ),
    ).toBe(true);
    expect(
      data.notifications.filter((notification) =>
        ["demo-user-admin", "demo-user-manager", "demo-user-mechanic"].includes(
          notification.userId,
        ),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: "demo-user-admin" }),
        expect.objectContaining({ userId: "demo-user-manager" }),
        expect.objectContaining({ userId: "demo-user-mechanic" }),
      ]),
    );
  });

  it("prevents duplicate completion and duplicate history", async () => {
    await fleetDataService.transitionWorkOrder("maintenance-obsidian-brakes", {
      actorUserId: "demo-user-mechanic",
      status: "in_progress",
    });
    await fleetDataService.transitionWorkOrder("maintenance-obsidian-brakes", {
      actorUserId: "demo-user-mechanic",
      odometerAtService: 211100,
      serviceNotes: "Brake service completed.",
      status: "completed",
      totalCost: 3200,
    });

    await expect(
      fleetDataService.transitionWorkOrder("maintenance-obsidian-brakes", {
        actorUserId: "demo-user-mechanic",
        odometerAtService: 211100,
        serviceNotes: "Duplicate completion.",
        status: "completed",
        totalCost: 3200,
      }),
    ).rejects.toMatchObject({ code: "invalid_transition" });
    expect(
      fleetDataService
        .getSnapshot()
        .maintenanceHistory.filter(
          (record) => record.workOrderId === "maintenance-obsidian-brakes",
        ),
    ).toHaveLength(1);
  });

  it("rejects invalid completion mileage, cost, and manager service execution", async () => {
    await fleetDataService.transitionWorkOrder("maintenance-obsidian-brakes", {
      actorUserId: "demo-user-mechanic",
      status: "in_progress",
    });
    await expect(
      fleetDataService.transitionWorkOrder("maintenance-obsidian-brakes", {
        actorUserId: "demo-user-mechanic",
        odometerAtService: 211039,
        serviceNotes: "Mileage is below the vehicle record.",
        status: "completed",
        totalCost: 100,
      }),
    ).rejects.toMatchObject({ code: "invalid_record" });
    await expect(
      fleetDataService.transitionWorkOrder("maintenance-obsidian-brakes", {
        actorUserId: "demo-user-mechanic",
        odometerAtService: 211100,
        serviceNotes: "Cost is invalid.",
        status: "completed",
        totalCost: -1,
      }),
    ).rejects.toMatchObject({ code: "invalid_record" });
    await expect(
      fleetDataService.transitionWorkOrder("maintenance-obsidian-brakes", {
        actorUserId: "demo-user-manager",
        odometerAtService: 211100,
        serviceNotes: "Manager cannot perform mechanic work.",
        status: "completed",
        totalCost: 100,
      }),
    ).rejects.toMatchObject({ code: "unauthorized" });

    expect(
      fleetDataService
        .getSnapshot()
        .maintenanceHistory.some(
          (record) => record.workOrderId === "maintenance-obsidian-brakes",
        ),
    ).toBe(false);
  });

  it("requires confirmation to cancel work in progress", async () => {
    await expect(
      fleetDataService.transitionWorkOrder("maintenance-vanta-transmission", {
        actorUserId: "demo-user-admin",
        status: "cancelled",
      }),
    ).rejects.toMatchObject({ code: "invalid_transition" });

    await fleetDataService.transitionWorkOrder(
      "maintenance-vanta-transmission",
      {
        actorUserId: "demo-user-admin",
        confirmCancellation: true,
        status: "cancelled",
      },
    );
    const data = fleetDataService.getSnapshot();
    expect(
      data.maintenanceWorkOrders.find(
        (record) => record.id === "maintenance-vanta-transmission",
      )?.status,
    ).toBe("cancelled");
    expect(
      data.maintenanceHistory.some(
        (record) => record.workOrderId === "maintenance-vanta-transmission",
      ),
    ).toBe(false);
  });

  it("updates vehicle mileage, recalculates service, and notifies every relevant role", async () => {
    await fleetDataService.createAssignment(
      {
        driverId: "driver-profile-maya",
        startDate: "2026-07-19",
        vehicleId: "vehicle-nova-7710",
      },
      "demo-user-manager",
    );
    await fleetDataService.transitionWorkOrder("maintenance-nova-safety", {
      actorUserId: "fleet-user-mechanic-ana",
      status: "in_progress",
    });
    await fleetDataService.transitionWorkOrder("maintenance-nova-safety", {
      actorUserId: "fleet-user-mechanic-ana",
      odometerAtService: 49000,
      serviceNotes: "Safety inspection completed.",
      status: "completed",
      totalCost: 750,
    });
    const data = fleetDataService.getSnapshot();
    const status = mileageService
      .getVehicleServiceStatuses(data, "vehicle-nova-7710")
      .find((item) => item.serviceTypeId === "service-type-safety");

    expect(
      data.vehicles.find((vehicle) => vehicle.id === "vehicle-nova-7710")
        ?.currentMileage,
    ).toBe(49000);
    expect(status).toMatchObject({
      lastCompletedServiceMileage: 49000,
      nextServiceMileage: 79000,
      status: "UPCOMING",
    });
    expect(
      data.notifications
        .filter(
          (notification) =>
            notification.title === "Vehicle maintenance completed",
        )
        .map((notification) => notification.userId),
    ).toEqual(
      expect.arrayContaining([
        "demo-user-admin",
        "demo-user-manager",
        "fleet-user-driver-maya",
        "fleet-user-mechanic-ana",
      ]),
    );
  });

  it("keeps maintenance-history identity immutable during audited corrections", async () => {
    const before = fleetDataService
      .getSnapshot()
      .maintenanceHistory.find(
        (record) => record.id === "history-axiom-inspection",
      );
    await fleetDataService.correctMaintenanceHistory(
      "history-axiom-inspection",
      {
        notes: "Corrected invoice total after receipt review.",
        odometerAtService: 183050,
        serviceDate: "2026-07-08",
        totalCost: 1450.75,
      },
      "demo-user-admin",
    );
    const data = fleetDataService.getSnapshot();
    const corrected = data.maintenanceHistory.find(
      (record) => record.id === "history-axiom-inspection",
    );

    expect(corrected).toMatchObject({
      id: before?.id,
      mechanicId: before?.mechanicId,
      serviceTypeId: before?.serviceTypeId,
      totalCost: 1450.75,
      vehicleId: before?.vehicleId,
      workOrderId: before?.workOrderId,
    });
    expect(
      data.auditEvents.some(
        (event) =>
          event.action === "Corrected maintenance history" &&
          event.entityId === corrected?.id,
      ),
    ).toBe(true);
  });

  it("creates, edits, and deactivates service types without removing linked history", async () => {
    const created = await fleetDataService.createServiceType(
      {
        description: "Inspect and replace differential lubricant.",
        name: "Differential service",
        recommendedIntervalKm: 50000,
      },
      "demo-user-admin",
    );
    await fleetDataService.updateServiceType(
      created.id,
      {
        description: "Inspect seals and replace differential lubricant.",
        name: "Differential service",
        recommendedIntervalKm: 45000,
      },
      "demo-user-admin",
    );
    await fleetDataService.deactivateServiceType(
      "service-type-preventive-a",
      "demo-user-admin",
    );
    const data = fleetDataService.getSnapshot();

    expect(
      data.serviceTypes.find((item) => item.id === created.id),
    ).toMatchObject({ recommendedIntervalKm: 45000, status: "Active" });
    expect(
      data.serviceTypes.find((item) => item.id === "service-type-preventive-a")
        ?.status,
    ).toBe("Inactive");
    expect(
      data.maintenanceHistory.find(
        (record) => record.id === "history-axiom-inspection",
      )?.serviceTypeId,
    ).toBe("service-type-preventive-a");
  });

  it("rejects impossible transitions and cross-mechanic updates", async () => {
    await expect(
      fleetDataService.transitionWorkOrder("maintenance-obsidian-brakes", {
        actorUserId: "demo-user-mechanic",
        serviceNotes: "Attempted completion.",
        status: "completed",
      }),
    ).rejects.toMatchObject({ code: "invalid_transition" });

    await fleetDataService.transitionWorkOrder("maintenance-obsidian-brakes", {
      actorUserId: "demo-user-mechanic",
      status: "in_progress",
    });
    await expect(
      fleetDataService.transitionWorkOrder("maintenance-obsidian-brakes", {
        actorUserId: "demo-user-mechanic",
        status: "completed",
      }),
    ).rejects.toMatchObject({ code: "invalid_record" });

    await expect(
      fleetDataService.transitionWorkOrder("maintenance-nova-safety", {
        actorUserId: "demo-user-mechanic",
        status: "in_progress",
      }),
    ).rejects.toMatchObject({ code: "unauthorized" });
  });

  it("enforces role restrictions inside operational mutations", async () => {
    await expect(
      fleetDataService.createMaintenanceSchedule(
        {
          dueDate: "2026-08-20",
          notes: "Unauthorized attempt",
          serviceTypeId: "service-type-brakes",
          vehicleId: "vehicle-axiom-2048",
        },
        "demo-user-driver",
      ),
    ).rejects.toMatchObject({ code: "unauthorized" });

    await expect(
      fleetDataService.createServiceType(
        {
          description: "Manager attempt",
          name: "Restricted service",
          recommendedIntervalKm: 10000,
        },
        "demo-user-manager",
      ),
    ).rejects.toMatchObject({ code: "unauthorized" });
  });
});
