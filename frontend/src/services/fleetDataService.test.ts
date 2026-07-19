import { beforeEach, describe, expect, it } from "vitest";

import { FLEET_STORAGE_KEYS, fleetDataService } from "./fleetDataService";

describe("fleetDataService", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("creates a driver user and linked profile atomically", async () => {
    const user = await fleetDataService.createDriver({
      email: "new.driver@forgefleet.demo",
      fullName: "New Driver",
      licenseNumber: "N03-26-998877",
    });
    const data = fleetDataService.getSnapshot();
    const profile = data.driverProfiles.find((item) => item.userId === user.id);

    expect(user).toMatchObject({ role: "driver", status: "Active" });
    expect(profile).toMatchObject({
      licenseNumber: "N03-26-998877",
      status: "Available",
      userId: user.id,
    });
  });

  it("creates a mechanic user and linked active profile atomically", async () => {
    const user = await fleetDataService.createMechanic({
      email: "new.mechanic@forgefleet.demo",
      fullName: "New Mechanic",
      specialization: "Hydraulic systems",
    });
    const profile = fleetDataService
      .getSnapshot()
      .mechanicProfiles.find((item) => item.userId === user.id);

    expect(user).toMatchObject({ role: "mechanic", status: "Active" });
    expect(profile).toMatchObject({
      specialization: "Hydraulic systems",
      status: "Active",
      userId: user.id,
    });
  });

  it("rejects duplicate emails and role-profile identifiers", async () => {
    await expect(
      fleetDataService.createDriver({
        email: "driver@forgefleet.demo",
        fullName: "Duplicate Email",
        licenseNumber: "NEW-LICENSE",
      }),
    ).rejects.toMatchObject({
      code: "duplicate_email",
    });

    await expect(
      fleetDataService.createDriver({
        email: "unique@forgefleet.demo",
        fullName: "Duplicate License",
        licenseNumber: "N01-23-456789",
      }),
    ).rejects.toMatchObject({
      code: "duplicate_license",
    });
  });

  it("rejects duplicate employee numbers across driver and mechanic profiles", async () => {
    await expect(
      fleetDataService.createDriver({
        email: "duplicate.employee.driver@forgefleet.demo",
        employeeNumber: "MEC-2001",
        fullName: "Duplicate Employee Driver",
        licenseNumber: "NEW-EMPLOYEE-LICENSE",
      }),
    ).rejects.toMatchObject({ code: "duplicate_employee_number" });

    await expect(
      fleetDataService.createMechanic({
        email: "duplicate.employee.mechanic@forgefleet.demo",
        employeeNumber: "DRV-1001",
        fullName: "Duplicate Employee Mechanic",
        specialization: "Suspension",
      }),
    ).rejects.toMatchObject({ code: "duplicate_employee_number" });
  });

  it("updates user and profile fields without changing the relationship", async () => {
    const before = fleetDataService.getSnapshot();
    const profile = before.driverProfiles.find(
      (item) => item.userId === "fleet-user-driver-liza",
    );
    expect(profile).toBeDefined();

    await fleetDataService.updateUser("fleet-user-driver-liza", {
      email: "liza.updated@forgefleet.demo",
      fullName: "Liza Mendoza Updated",
      licenseNumber: "N02-24-445566",
    });
    const after = fleetDataService.getSnapshot();

    expect(
      after.users.find((item) => item.id === "fleet-user-driver-liza"),
    ).toMatchObject({
      email: "liza.updated@forgefleet.demo",
      fullName: "Liza Mendoza Updated",
    });
    expect(
      after.driverProfiles.find((item) => item.id === profile?.id),
    ).toMatchObject({
      licenseNumber: "N02-24-445566",
      userId: "fleet-user-driver-liza",
    });
  });

  it("blocks driver and mechanic deactivation while active work is linked", async () => {
    const data = fleetDataService.getSnapshot();
    const driver = data.driverProfiles.find(
      (item) => item.userId === "demo-user-driver",
    );
    const mechanic = data.mechanicProfiles.find(
      (item) => item.userId === "demo-user-mechanic",
    );

    await expect(
      fleetDataService.deactivateDriver(driver?.id ?? "", "demo-user-admin"),
    ).rejects.toMatchObject({
      code: "linked_record",
    });
    await expect(
      fleetDataService.deactivateMechanic(
        mechanic?.id ?? "",
        "demo-user-admin",
      ),
    ).rejects.toMatchObject({
      code: "linked_record",
    });
  });

  it("deactivates an unassigned driver while preserving the profile", async () => {
    const user = await fleetDataService.createDriver({
      email: "available.driver@forgefleet.demo",
      fullName: "Available Driver",
      licenseNumber: "N04-26-112244",
    });
    const profile = fleetDataService
      .getSnapshot()
      .driverProfiles.find((item) => item.userId === user.id);

    await fleetDataService.deactivateDriver(
      profile?.id ?? "",
      "demo-user-admin",
    );
    const data = fleetDataService.getSnapshot();

    expect(data.users.find((item) => item.id === user.id)?.status).toBe(
      "Inactive",
    );
    expect(
      data.driverProfiles.find((item) => item.id === profile?.id)?.status,
    ).toBe("Inactive");
  });

  it("blocks mechanic deactivation while planned work is assigned", async () => {
    const user = await fleetDataService.createMechanic({
      email: "planned.mechanic@forgefleet.demo",
      employeeNumber: "MEC-9020",
      fullName: "Planned Work Mechanic",
      specialization: "Preventive maintenance",
    });
    const profile = fleetDataService
      .getSnapshot()
      .mechanicProfiles.find((item) => item.userId === user.id);
    await fleetDataService.createMaintenanceSchedule(
      {
        assignedMechanicId: profile?.id,
        dueDate: "2026-08-01",
        notes: "Planned relationship protection test.",
        serviceTypeId: "service-type-brakes",
        vehicleId: "vehicle-nova-7710",
      },
      "demo-user-manager",
    );

    await expect(
      fleetDataService.deactivateMechanic(profile?.id ?? "", "demo-user-admin"),
    ).rejects.toMatchObject({ code: "linked_record" });
  });

  it("validates vehicle uniqueness and relationship protections", async () => {
    await expect(
      fleetDataService.createVehicle({
        currentMileage: 0,
        fleetNumber: "FLT-2048",
        make: "Test",
        model: "Duplicate",
        plateNumber: "NEW 1000",
        status: "Active",
        type: "Service Van",
        vin: "TESTVIN0000000001",
        year: 2026,
      }),
    ).rejects.toMatchObject({
      code: "duplicate_fleet_number",
    });

    await expect(
      fleetDataService.deactivateVehicle("vehicle-axiom-2048"),
    ).rejects.toMatchObject({
      code: "linked_record",
    });

    const linkedVehicle = fleetDataService
      .getSnapshot()
      .vehicles.find((item) => item.id === "vehicle-axiom-2048");
    await expect(
      fleetDataService.updateVehicle("vehicle-axiom-2048", {
        currentMileage: linkedVehicle?.currentMileage ?? 0,
        fleetNumber: linkedVehicle?.fleetNumber ?? "",
        make: linkedVehicle?.make ?? "",
        model: linkedVehicle?.model ?? "",
        plateNumber: linkedVehicle?.plateNumber ?? "",
        status: "Out of Service",
        type: linkedVehicle?.type ?? "",
        vin: linkedVehicle?.vin ?? "",
        year: linkedVehicle?.year ?? 2026,
      }),
    ).rejects.toMatchObject({ code: "linked_record" });

    const vehicle = await fleetDataService.createVehicle({
      currentMileage: 250,
      fleetNumber: "FLT-9001",
      make: "Forge Motors",
      model: "Workshop Runner",
      plateNumber: "FF 9001",
      status: "Inspection",
      type: "Service Van",
      vin: "TESTVIN0000009001",
      year: 2026,
    });
    await fleetDataService.deactivateVehicle(vehicle.id);

    expect(
      fleetDataService
        .getSnapshot()
        .vehicles.find((item) => item.id === vehicle.id)?.status,
    ).toBe("Out of Service");
  });

  it("rejects duplicate vehicle plates and VINs independently", async () => {
    await expect(
      fleetDataService.createVehicle({
        currentMileage: 100,
        fleetNumber: "FLT-PLATE-TEST",
        make: "Forge Motors",
        model: "Plate Test",
        plateNumber: "ff 2048",
        status: "Active",
        type: "Service Van",
        vin: "UNIQUEVINPLATE0001",
        year: 2026,
      }),
    ).rejects.toMatchObject({ code: "duplicate_plate" });

    await expect(
      fleetDataService.createVehicle({
        currentMileage: 100,
        fleetNumber: "FLT-VIN-TEST",
        make: "Forge Motors",
        model: "VIN Test",
        plateNumber: "UNIQUE PLATE",
        status: "Active",
        type: "Service Van",
        vin: "1ffaxiom204800001",
        year: 2026,
      }),
    ).rejects.toMatchObject({ code: "duplicate_vin" });
  });

  it("rejects invalid vehicle year, mileage, and runtime status values", async () => {
    const validVehicle = {
      currentMileage: 100,
      fleetNumber: "FLT-VALIDATION",
      make: "Forge Motors",
      model: "Validation Runner",
      plateNumber: "VALID 100",
      status: "Active" as const,
      type: "Service Van",
      vin: "VALIDATIONVIN00001",
      year: 2026,
    };

    await expect(
      fleetDataService.createVehicle({ ...validVehicle, year: Number.NaN }),
    ).rejects.toMatchObject({ code: "invalid_record" });
    await expect(
      fleetDataService.createVehicle({
        ...validVehicle,
        currentMileage: -1,
      }),
    ).rejects.toMatchObject({ code: "invalid_record" });
    await expect(
      fleetDataService.createVehicle({
        ...validVehicle,
        status: "Retired" as typeof validVehicle.status,
      }),
    ).rejects.toMatchObject({ code: "invalid_record" });
  });

  it("archives historically referenced records without deleting relationships", async () => {
    await fleetDataService.endAssignment(
      "assignment-forge-liza",
      "2026-07-19",
      "demo-user-manager",
    );
    await fleetDataService.deactivateVehicle("vehicle-forge-0631");
    await fleetDataService.deactivateDriver(
      "driver-profile-liza",
      "demo-user-admin",
    );
    await fleetDataService.transitionWorkOrder("maintenance-nova-safety", {
      actorUserId: "demo-user-admin",
      status: "cancelled",
    });
    await fleetDataService.cancelMaintenanceSchedule(
      "schedule-forge-safety",
      "demo-user-admin",
    );
    await fleetDataService.cancelMaintenanceSchedule(
      "schedule-nova-calibration",
      "demo-user-admin",
    );
    await fleetDataService.deactivateMechanic(
      "mechanic-profile-ana",
      "demo-user-admin",
    );
    const data = fleetDataService.getSnapshot();

    expect(
      data.vehicles.find((vehicle) => vehicle.id === "vehicle-forge-0631")
        ?.status,
    ).toBe("Out of Service");
    expect(
      data.driverProfiles.find(
        (profile) => profile.id === "driver-profile-liza",
      )?.status,
    ).toBe("Inactive");
    expect(
      data.mechanicProfiles.find(
        (profile) => profile.id === "mechanic-profile-ana",
      )?.status,
    ).toBe("Inactive");
    expect(
      data.assignments.some(
        (assignment) => assignment.id === "assignment-forge-liza",
      ),
    ).toBe(true);
    expect(
      data.maintenanceHistory.find(
        (record) => record.id === "history-forge-electrical",
      ),
    ).toMatchObject({
      mechanicId: "mechanic-profile-ana",
      vehicleId: "vehicle-forge-0631",
    });
  });

  it("migrates valid v2 browser data into the canonical v4 state", () => {
    const legacyData = {
      assignments: [
        {
          driverProfileId: "legacy-driver-profile",
          endDate: null,
          id: "legacy-assignment",
          startDate: "2026-01-01",
          status: "Active",
          vehicleId: "legacy-vehicle",
        },
      ],
      driverProfiles: [
        {
          id: "legacy-driver-profile",
          licenseNumber: "LEGACY-LICENSE",
          status: "Assigned",
          userId: "legacy-driver-user",
        },
      ],
      maintenanceRecords: [],
      maintenanceSchedules: [],
      managerProfiles: [],
      mechanicProfiles: [],
      mileageSubmissions: [
        {
          driverProfileId: "legacy-driver-profile",
          id: "legacy-mileage",
          mileage: 12000,
          notes: "Migrated reading",
          submittedAt: "2026-07-01T12:00:00Z",
          vehicleId: "legacy-vehicle",
        },
      ],
      notifications: [
        {
          createdAt: "2026-07-01T12:00:00Z",
          destination: "/driver/mileage",
          id: "legacy-notification",
          message: "Mileage recorded.",
          read: false,
          title: "Mileage update",
          type: "Mileage",
          userId: "legacy-driver-user",
        },
      ],
      serviceTypes: [
        {
          active: true,
          description: "Legacy service",
          id: "legacy-service",
          name: "Legacy service",
        },
      ],
      systemActivity: [
        {
          action: "Submitted mileage",
          entityLabel: "Legacy vehicle",
          id: "legacy-audit",
          occurredAt: "2026-07-01T12:00:00Z",
          userId: "legacy-driver-user",
        },
      ],
      users: [
        {
          email: "legacy.driver@example.com",
          fullName: "Legacy Driver",
          id: "legacy-driver-user",
          role: "driver",
          status: "Active",
        },
      ],
      vehicles: [
        {
          fleetNumber: "LEG-001",
          health: 90,
          id: "legacy-vehicle",
          manufacturer: "Legacy Motors",
          mileage: 12000,
          model: "Runner",
          plate: "LEG 001",
          status: "Active",
          type: "Service Van",
          year: 2020,
        },
      ],
    };
    window.localStorage.setItem(
      FLEET_STORAGE_KEYS.legacy,
      JSON.stringify({ data: legacyData, version: 2 }),
    );

    const migrated = fleetDataService.getSnapshot();

    expect(migrated.driverProfiles[0]).toMatchObject({
      employeeNumber: "DRV-0001",
      userId: "legacy-driver-user",
    });
    expect(migrated.vehicles[0]).toMatchObject({
      currentMileage: 12000,
      make: "Legacy Motors",
      plateNumber: "LEG 001",
    });
    expect(migrated.mileageLogs[0]).toMatchObject({
      driverId: "legacy-driver-profile",
      odometerReading: 12000,
    });
    expect(
      window.localStorage.getItem(FLEET_STORAGE_KEYS.current),
    ).not.toBeNull();
    expect(window.localStorage.getItem(FLEET_STORAGE_KEYS.legacy)).toBeNull();
  });

  it("migrates v3 date-derived schedule statuses to manual plans", () => {
    const version3Data = structuredClone(fleetDataService.getSnapshot());
    version3Data.maintenanceSchedules[0].status = "Planned";
    const legacySchedule = {
      ...version3Data.maintenanceSchedules[0],
      status: "Overdue",
    };
    const legacyData = {
      ...version3Data,
      maintenanceSchedules: [
        legacySchedule,
        ...version3Data.maintenanceSchedules.slice(1).map((schedule) => ({
          ...schedule,
          status: "Upcoming",
        })),
      ],
    };
    window.localStorage.setItem(
      FLEET_STORAGE_KEYS.legacy,
      JSON.stringify({ data: legacyData, version: 3 }),
    );

    const migrated = fleetDataService.getSnapshot();

    expect(
      migrated.maintenanceSchedules.every(
        (schedule) => schedule.status === "Planned",
      ),
    ).toBe(true);
    expect(
      window.localStorage.getItem(FLEET_STORAGE_KEYS.current),
    ).not.toBeNull();
    expect(window.localStorage.getItem(FLEET_STORAGE_KEYS.legacy)).toBeNull();
  });

  it("fails closed to seeded data when persisted relationships are malformed", () => {
    const malformed = structuredClone(fleetDataService.getSnapshot());
    malformed.assignments[0].driverId = "missing-driver-profile";
    window.localStorage.setItem(
      FLEET_STORAGE_KEYS.current,
      JSON.stringify({ data: malformed, version: FLEET_STORAGE_KEYS.version }),
    );

    const recovered = fleetDataService.getSnapshot();

    expect(recovered.assignments[0].driverId).toBe("driver-profile-carlo");
    expect(window.localStorage.getItem(FLEET_STORAGE_KEYS.current)).toBeNull();
  });

  it("fails closed when stored data contains conflicting active assignments", () => {
    const current = fleetDataService.getSnapshot();
    const malformed = {
      ...structuredClone(current),
      assignments: [
        ...current.assignments,
        {
          driverId: "driver-profile-carlo",
          endDate: null,
          id: "conflicting-active-assignment",
          startDate: "2026-07-19",
          status: "Active" as const,
          vehicleId: "vehicle-nova-7710",
        },
      ],
    };
    window.localStorage.setItem(
      FLEET_STORAGE_KEYS.current,
      JSON.stringify({ data: malformed, version: FLEET_STORAGE_KEYS.version }),
    );

    const recovered = fleetDataService.getSnapshot();

    expect(
      recovered.assignments.some(
        (assignment) => assignment.id === "conflicting-active-assignment",
      ),
    ).toBe(false);
    expect(window.localStorage.getItem(FLEET_STORAGE_KEYS.current)).toBeNull();
  });
});
