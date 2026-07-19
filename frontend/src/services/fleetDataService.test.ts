import { beforeEach, describe, expect, it } from "vitest";

import { fleetDataService } from "./fleetDataService";

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
      specialty: "Hydraulic systems",
    });
    const profile = fleetDataService
      .getSnapshot()
      .mechanicProfiles.find((item) => item.userId === user.id);

    expect(user).toMatchObject({ role: "mechanic", status: "Active" });
    expect(profile).toMatchObject({
      specialty: "Hydraulic systems",
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

  it("validates vehicle uniqueness and relationship protections", async () => {
    await expect(
      fleetDataService.createVehicle({
        fleetNumber: "FLT-2048",
        manufacturer: "Test",
        mileage: 0,
        model: "Duplicate",
        plate: "NEW 1000",
        status: "Active",
        type: "Service Van",
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
        fleetNumber: linkedVehicle?.fleetNumber ?? "",
        manufacturer: linkedVehicle?.manufacturer ?? "",
        mileage: linkedVehicle?.mileage ?? 0,
        model: linkedVehicle?.model ?? "",
        plate: linkedVehicle?.plate ?? "",
        status: "Out of Service",
        type: linkedVehicle?.type ?? "",
        year: linkedVehicle?.year ?? 2026,
      }),
    ).rejects.toMatchObject({ code: "linked_record" });

    const vehicle = await fleetDataService.createVehicle({
      fleetNumber: "FLT-9001",
      manufacturer: "Forge Motors",
      mileage: 250,
      model: "Workshop Runner",
      plate: "FF 9001",
      status: "Inspection",
      type: "Service Van",
      year: 2026,
    });
    await fleetDataService.deactivateVehicle(vehicle.id);

    expect(
      fleetDataService
        .getSnapshot()
        .vehicles.find((item) => item.id === vehicle.id)?.status,
    ).toBe("Out of Service");
  });
});
