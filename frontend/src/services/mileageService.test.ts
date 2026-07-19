import { beforeEach, describe, expect, it } from "vitest";

import { fleetDataService } from "./fleetDataService";
import { DUE_SOON_THRESHOLD_KM, mileageService } from "./mileageService";

const VEHICLE_ID = "vehicle-axiom-2048";
const SERVICE_TYPE_ID = "service-type-preventive-a";

function getPreventiveStatus(currentMileage: number) {
  const data = fleetDataService.getSnapshot();
  return mileageService
    .getVehicleServiceStatuses(data, VEHICLE_ID, currentMileage)
    .find((item) => item.serviceTypeId === SERVICE_TYPE_ID);
}

describe("mileage-based service calculations", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("calculates UPCOMING above the centralized due-soon threshold", () => {
    expect(DUE_SOON_THRESHOLD_KM).toBe(1000);
    expect(getPreventiveStatus(191999)).toMatchObject({
      currentMileage: 191999,
      lastCompletedServiceMileage: 183000,
      nextServiceMileage: 193000,
      recommendedIntervalKm: 10000,
      remainingDistance: 1001,
      status: "UPCOMING",
    });
  });

  it("calculates DUE_SOON at the configured threshold", () => {
    expect(getPreventiveStatus(192000)).toMatchObject({
      remainingDistance: 1000,
      status: "DUE_SOON",
    });
  });

  it("calculates DUE_NOW at the next-service mileage", () => {
    expect(getPreventiveStatus(193000)).toMatchObject({
      remainingDistance: 0,
      status: "DUE_NOW",
    });
  });

  it("calculates OVERDUE above the next-service mileage", () => {
    expect(getPreventiveStatus(193001)).toMatchObject({
      remainingDistance: -1,
      status: "OVERDUE",
    });
  });

  it("returns NO_HISTORY without inventing service mileage", () => {
    const data = fleetDataService.getSnapshot();
    const status = mileageService
      .getVehicleServiceStatuses(data, VEHICLE_ID)
      .find((item) => item.serviceTypeId === "service-type-brakes");

    expect(status).toMatchObject({
      lastCompletedServiceMileage: null,
      nextServiceMileage: null,
      remainingDistance: null,
      status: "NO_HISTORY",
    });
  });

  it("derives a separate result for every active service type", () => {
    const data = fleetDataService.getSnapshot();
    const statuses = mileageService.getVehicleServiceStatuses(data, VEHICLE_ID);

    expect(statuses).toHaveLength(
      data.serviceTypes.filter((item) => item.status === "Active").length,
    );
    expect(new Set(statuses.map((item) => item.serviceTypeId)).size).toBe(
      statuses.length,
    );
    expect(statuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          serviceTypeId: SERVICE_TYPE_ID,
          status: "UPCOMING",
        }),
        expect.objectContaining({
          serviceTypeId: "service-type-brakes",
          status: "NO_HISTORY",
        }),
      ]),
    );
  });

  it("does not use manually planned dates to calculate service status", () => {
    const data = fleetDataService.getSnapshot();
    const before = mileageService.getVehicleServiceStatuses(data, VEHICLE_ID);
    const changedPlans = {
      ...data,
      maintenanceSchedules: data.maintenanceSchedules.map((schedule, index) =>
        schedule.vehicleId === VEHICLE_ID
          ? {
              ...schedule,
              dueDate: index % 2 === 0 ? "2000-01-01" : "2099-12-31",
            }
          : schedule,
      ),
    };

    expect(
      mileageService.getVehicleServiceStatuses(changedPlans, VEHICLE_ID),
    ).toEqual(before);
  });

  it("recalculates after a new mileage log updates the vehicle", async () => {
    await fleetDataService.submitMileage(
      {
        notes: "Boundary calculation",
        odometerReading: 192000,
        submissionDate: "2026-07-19",
      },
      "demo-user-driver",
    );
    const data = fleetDataService.getSnapshot();
    const status = mileageService
      .getVehicleServiceStatuses(data, VEHICLE_ID)
      .find((item) => item.serviceTypeId === SERVICE_TYPE_ID);

    expect(status).toMatchObject({
      currentMileage: 192000,
      remainingDistance: 1000,
      status: "DUE_SOON",
    });
  });

  it("recalculates next-service mileage after completed maintenance", async () => {
    const before = mileageService
      .getVehicleServiceStatuses(
        fleetDataService.getSnapshot(),
        "vehicle-nova-7710",
      )
      .find((item) => item.serviceTypeId === "service-type-safety");
    expect(before?.status).toBe("NO_HISTORY");

    await fleetDataService.transitionWorkOrder("maintenance-nova-safety", {
      actorUserId: "fleet-user-mechanic-ana",
      status: "in_progress",
    });
    await fleetDataService.transitionWorkOrder("maintenance-nova-safety", {
      actorUserId: "fleet-user-mechanic-ana",
      odometerAtService: 48760,
      serviceNotes: "Completed the first recorded safety service.",
      status: "completed",
      totalCost: 1250,
    });

    const after = mileageService
      .getVehicleServiceStatuses(
        fleetDataService.getSnapshot(),
        "vehicle-nova-7710",
      )
      .find((item) => item.serviceTypeId === "service-type-safety");
    expect(after).toMatchObject({
      currentMileage: 48760,
      lastCompletedServiceMileage: 48760,
      nextServiceMileage: 78760,
      recommendedIntervalKm: 30000,
      remainingDistance: 30000,
      status: "UPCOMING",
    });
  });
});
