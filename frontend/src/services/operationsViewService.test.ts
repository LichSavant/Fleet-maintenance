import { describe, expect, it } from "vitest";

import type { FleetDataSource } from "../types/fleet";
import { operationsViewService } from "./operationsViewService";

const fixture: FleetDataSource = {
  assignments: [
    {
      driverProfileId: "driver-profile",
      endDate: null,
      id: "assignment",
      startDate: "2026-07-19",
      status: "Active",
      vehicleId: "vehicle",
    },
  ],
  driverProfiles: [
    {
      id: "driver-profile",
      licenseNumber: "LICENSE-001",
      status: "Assigned",
      userId: "driver-user",
    },
  ],
  maintenanceRecords: [
    {
      completedDate: "2026-07-20",
      createdAt: "2026-07-19T00:00:00Z",
      createdByUserId: "manager-user",
      id: "work-order",
      mechanicProfileId: "mechanic-profile",
      notes: "Scheduled service",
      priority: "Medium",
      scheduleId: null,
      scheduledDate: "2026-07-20",
      serviceNotes: "Completed safely",
      serviceTypeId: "service-type",
      status: "completed",
      vehicleId: "vehicle",
    },
  ],
  maintenanceSchedules: [],
  managerProfiles: [],
  mechanicProfiles: [
    {
      id: "mechanic-profile",
      specialty: "General maintenance",
      status: "Active",
      userId: "mechanic-user",
    },
  ],
  mileageSubmissions: [],
  notifications: [],
  serviceTypes: [
    {
      active: true,
      description: "Routine service",
      id: "service-type",
      name: "Oil Change",
    },
  ],
  systemActivity: [],
  users: [
    {
      email: "driver@example.com",
      fullName: "Driver One",
      id: "driver-user",
      role: "driver",
      status: "Active",
    },
    {
      email: "mechanic@example.com",
      fullName: "Mechanic One",
      id: "mechanic-user",
      role: "mechanic",
      status: "Active",
    },
  ],
  vehicles: [
    {
      fleetNumber: "FLT-001",
      health: 90,
      id: "vehicle",
      manufacturer: "Volvo",
      mileage: 1200,
      model: "FH",
      plate: "ABC-123",
      status: "Active",
      type: "Truck",
      year: 2025,
    },
  ],
};

describe("operationsViewService", () => {
  it("joins assignments, users, and vehicles without placeholder records", () => {
    const [view] = operationsViewService.getAssignments(fixture);
    expect(view.driver.fullName).toBe("Driver One");
    expect(view.vehicle.plate).toBe("ABC-123");
  });

  it("limits driver maintenance to the currently assigned vehicle", () => {
    const result = operationsViewService.getDriverMaintenance(
      fixture,
      "driver-user",
    );
    expect(result.vehicle?.id).toBe("vehicle");
    expect(result.workOrders.map(({ workOrder }) => workOrder.id)).toEqual([
      "work-order",
    ]);
  });
});
