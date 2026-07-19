import { beforeEach, describe, expect, it } from "vitest";

import { authService } from "./authService";
import { dashboardService } from "./dashboardService";
import { fleetDataService } from "./fleetDataService";
import { mileageService } from "./mileageService";
import { operationsViewService } from "./operationsViewService";
import { reportService } from "./reportService";

describe("presentation demonstration flow", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("completes the administrator-to-driver-to-mechanic Fleet Maintenance Log flow", async () => {
    const administrator = await authService.signIn({
      email: "admin@forgefleet.demo",
      password: "admin123",
    });
    fleetDataService.recordAuthenticationEvent(
      administrator.user.id,
      "Signed in",
    );

    const vehicle = await fleetDataService.createVehicle(
      {
        currentMileage: 1000,
        fleetNumber: "DEMO-9001",
        make: "Forge Motors",
        model: "Presentation Runner",
        plateNumber: "DEMO 9001",
        status: "Active",
        type: "Service Van",
        vin: "DEMO2026000009001",
        year: 2026,
      },
      administrator.user.id,
    );

    await expect(
      fleetDataService.createVehicle(
        {
          ...vehicle,
          fleetNumber: "DEMO-9002",
          vin: "DEMO2026000009002",
        },
        administrator.user.id,
      ),
    ).rejects.toMatchObject({ code: "duplicate_plate" });
    await expect(
      fleetDataService.createVehicle(
        {
          ...vehicle,
          fleetNumber: "DEMO-9003",
          plateNumber: "DEMO 9003",
        },
        administrator.user.id,
      ),
    ).rejects.toMatchObject({ code: "duplicate_vin" });

    authService.signOut();
    const manager = await authService.signIn({
      email: "manager@forgefleet.demo",
      password: "manager123",
    });
    const beforeAssignment = fleetDataService.getSnapshot();
    const driverProfile = beforeAssignment.driverProfiles.find(
      (profile) => profile.userId === "demo-user-driver",
    );
    const previousAssignment = beforeAssignment.assignments.find(
      (assignment) =>
        assignment.driverId === driverProfile?.id &&
        assignment.status === "Active",
    );
    expect(driverProfile).toBeDefined();
    expect(previousAssignment).toBeDefined();
    await fleetDataService.endAssignment(
      previousAssignment!.id,
      "2026-07-19",
      manager.user.id,
    );
    const assignment = await fleetDataService.createAssignment(
      {
        driverId: driverProfile!.id,
        startDate: "2026-07-19",
        vehicleId: vehicle.id,
      },
      manager.user.id,
    );

    authService.signOut();
    const driver = await authService.signIn({
      email: "driver@forgefleet.demo",
      password: "driver123",
    });
    const driverDashboard = dashboardService.getDriverDashboard(
      fleetDataService.getSnapshot(),
      driver.user,
    );
    expect(driverDashboard.activeAssignment?.id).toBe(assignment.id);
    expect(driverDashboard.assignedVehicle?.id).toBe(vehicle.id);

    const mileageLog = await fleetDataService.submitMileage(
      {
        notes: "Presentation route reading.",
        odometerReading: 1500,
        submissionDate: "2026-07-19",
      },
      driver.user.id,
    );
    for (const odometerReading of [1499, 1500]) {
      await expect(
        fleetDataService.submitMileage(
          {
            notes: "Rejected presentation reading.",
            odometerReading,
            submissionDate: "2026-07-19",
          },
          driver.user.id,
        ),
      ).rejects.toMatchObject({ code: "invalid_mileage" });
    }
    let data = fleetDataService.getSnapshot();
    expect(
      data.vehicles.find((item) => item.id === vehicle.id)?.currentMileage,
    ).toBe(1500);
    expect(
      mileageService
        .getVehicleServiceStatuses(data, vehicle.id)
        .every((status) => status.status === "NO_HISTORY"),
    ).toBe(true);

    authService.signOut();
    await authService.signIn({
      email: "manager@forgefleet.demo",
      password: "manager123",
    });
    const workOrder = await fleetDataService.createWorkOrder(
      {
        assignedMechanicId: "mechanic-profile-noel",
        notes: "Establish the first mileage-based service record.",
        priority: "Medium",
        scheduledDate: "2026-07-19",
        serviceTypeId: "service-type-preventive-a",
        vehicleId: vehicle.id,
      },
      manager.user.id,
    );

    authService.signOut();
    const mechanic = await authService.signIn({
      email: "mechanic@forgefleet.demo",
      password: "mechanic123",
    });
    expect(
      operationsViewService
        .getWorkOrdersForMechanic(
          fleetDataService.getSnapshot(),
          mechanic.user.id,
        )
        .some((record) => record.workOrder.id === workOrder.id),
    ).toBe(true);
    await fleetDataService.transitionWorkOrder(workOrder.id, {
      actorUserId: mechanic.user.id,
      status: "in_progress",
    });
    await fleetDataService.transitionWorkOrder(workOrder.id, {
      actorUserId: mechanic.user.id,
      odometerAtService: 1500,
      serviceNotes: "Inspection completed and fluid levels verified.",
      status: "completed",
      totalCost: 1250,
    });

    data = fleetDataService.getSnapshot();
    const history = data.maintenanceHistory.find(
      (record) => record.workOrderId === workOrder.id,
    );
    const nextService = mileageService
      .getVehicleServiceStatuses(data, vehicle.id)
      .find((status) => status.serviceTypeId === "service-type-preventive-a");
    expect(history).toMatchObject({
      odometerAtService: 1500,
      totalCost: 1250,
      vehicleId: vehicle.id,
    });
    expect(nextService).toMatchObject({
      lastCompletedServiceMileage: 1500,
      nextServiceMileage: 11500,
      remainingDistance: 10000,
      status: "UPCOMING",
    });
    expect(
      data.notifications.some(
        (notification) =>
          notification.title === "Vehicle maintenance completed" &&
          notification.userId === driver.user.id,
      ),
    ).toBe(true);
    expect(
      data.auditEvents.some(
        (event) =>
          event.action === "Submitted mileage" &&
          event.entityId === mileageLog.id,
      ),
    ).toBe(true);
    expect(
      data.auditEvents.some(
        (event) =>
          event.action === "Completed maintenance work" &&
          event.entityId === workOrder.id,
      ),
    ).toBe(true);

    const reports = reportService.getReports(data);
    expect(
      reports.vehicleInventory.rows.some(
        (record) => record.vehicle.id === vehicle.id,
      ),
    ).toBe(true);
    expect(
      reports.mileageByVehicle.rows.some(
        (record) =>
          record.vehicle.id === vehicle.id && record.currentMileage === 1500,
      ),
    ).toBe(true);
    expect(
      reports.maintenanceHistory.rows.some(
        (record) => record.history.id === history?.id,
      ),
    ).toBe(true);

    await expect(
      fleetDataService.createVehicle(
        {
          currentMileage: 0,
          fleetNumber: "UNAUTHORIZED-1",
          make: "Blocked",
          model: "Attempt",
          plateNumber: "BLOCKED 1",
          status: "Active",
          type: "Service Van",
          vin: "BLOCKEDVIN00000001",
          year: 2026,
        },
        driver.user.id,
      ),
    ).rejects.toMatchObject({ code: "unauthorized" });

    authService.signOut();
    expect(authService.getSession()).toBeNull();
  });
});
