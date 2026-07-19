import { beforeEach, describe, expect, it } from "vitest";

import { operationsViewService } from "./operationsViewService";
import { fleetDataService } from "./fleetDataService";

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
      serviceNotes:
        "Pressure regulator replaced and braking pressure verified.",
      status: "completed",
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
      odometerAtService: 211040,
      vehicleId: "vehicle-obsidian-3990",
    });
    expect(
      operationsViewService
        .getServiceHistory(data)
        .some(({ history: record }) => record.workOrderId === completed?.id),
    ).toBe(true);
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
