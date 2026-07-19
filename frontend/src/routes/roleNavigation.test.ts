import { describe, expect, it } from "vitest";

import { ROLE_NAVIGATION } from "./roleNavigation";

describe("role navigation contract", () => {
  it("preserves every role-scoped module required by ForgeFleet", () => {
    expect(ROLE_NAVIGATION.admin.map((item) => item.label)).toEqual([
      "Administrator dashboard",
      "Users",
      "Drivers",
      "Mechanics",
      "Vehicles",
      "Assignments",
      "Schedules",
      "Work orders",
      "Service history",
      "Service types",
      "Reports",
    ]);

    expect(ROLE_NAVIGATION.manager.map((item) => item.label)).toEqual([
      "Manager dashboard",
      "Drivers",
      "Mechanics",
      "Vehicles",
      "Assignments",
      "Schedules",
      "Work orders",
      "Service history",
      "Service types",
      "Reports",
    ]);

    expect(ROLE_NAVIGATION.mechanic.map((item) => item.label)).toEqual([
      "Mechanic dashboard",
      "My work orders",
      "Service history",
    ]);

    expect(ROLE_NAVIGATION.driver.map((item) => item.label)).toEqual([
      "Driver dashboard",
      "Mileage",
      "Maintenance",
      "Service history",
    ]);
  });
});
