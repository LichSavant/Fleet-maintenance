import { beforeEach, describe, expect, it } from "vitest";

import { fleetDataService } from "./fleetDataService";
import { mileageService } from "./mileageService";

describe("mileage maintenance calculations", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("derives not-due, due-soon, due-now, and overdue from mileage", () => {
    const data = fleetDataService.getSnapshot();
    const getPreventiveStatus = (currentMileage: number) =>
      mileageService
        .getVehicleServiceStatuses(data, "vehicle-axiom-2048", currentMileage)
        .find((item) => item.serviceTypeId === "service-type-preventive-a");

    expect(getPreventiveStatus(191999)).toMatchObject({
      dueSoonMileage: 192000,
      lastServiceMileage: 183000,
      nextServiceMileage: 193000,
      status: "not_due",
    });
    expect(getPreventiveStatus(192000)?.status).toBe("due_soon");
    expect(getPreventiveStatus(193000)?.status).toBe("due_now");
    expect(getPreventiveStatus(193001)?.status).toBe("overdue");
  });
});
