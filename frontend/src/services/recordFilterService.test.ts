import { describe, expect, it } from "vitest";

import { MOCK_FLEET_DATA } from "../data/mockFleetData";
import { managementViewService } from "./managementViewService";
import { operationsViewService } from "./operationsViewService";
import { recordFilterService } from "./recordFilterService";
import { reportService } from "./reportService";

describe("recordFilterService", () => {
  it("combines case-insensitive vehicle, driver, and mechanic filters", () => {
    const vehicleRecords = managementViewService.getVehicles(MOCK_FLEET_DATA);
    const vehicleTarget = vehicleRecords[0];
    const vehicles = recordFilterService.filterVehicles(vehicleRecords, {
      search: vehicleTarget.vehicle.vin.toLocaleUpperCase(),
      status: vehicleTarget.vehicle.status,
      type: vehicleTarget.vehicle.type,
    });

    expect(vehicles.map((record) => record.vehicle.id)).toEqual([
      vehicleTarget.vehicle.id,
    ]);

    const driverRecords = managementViewService.getDrivers(MOCK_FLEET_DATA);
    const driverTarget = driverRecords.find(
      (record) => record.assignedVehicle && record.activeAssignment,
    );
    if (!driverTarget?.assignedVehicle) {
      throw new Error("Missing assigned driver fixture.");
    }
    const drivers = recordFilterService.filterDrivers(driverRecords, {
      assignment: "assigned",
      search: driverTarget.assignedVehicle.plateNumber.toLocaleLowerCase(),
      status: driverTarget.profile.status,
    });

    expect(drivers.map((record) => record.profile.id)).toEqual([
      driverTarget.profile.id,
    ]);

    const mechanicRecords = managementViewService.getMechanics(MOCK_FLEET_DATA);
    const mechanicTarget = mechanicRecords[0];
    const mechanics = recordFilterService.filterMechanics(mechanicRecords, {
      search: mechanicTarget.profile.specialization.toLocaleUpperCase(),
      status: mechanicTarget.user.status,
      work: mechanicTarget.openWork > 0 ? "open" : "clear",
    });

    expect(mechanics).toContainEqual(mechanicTarget);
    expect(
      mechanics.every(
        (record) =>
          record.user.status === mechanicTarget.user.status &&
          (mechanicTarget.openWork > 0
            ? record.openWork > 0
            : record.openWork === 0),
      ),
    ).toBe(true);
  });

  it("combines assignment status, record search, and inclusive date range", () => {
    const source = operationsViewService.getAssignments(MOCK_FLEET_DATA);
    const target = source[0];
    const rows = recordFilterService.filterAssignments(source, {
      dateFrom: target.assignment.startDate,
      dateTo: target.assignment.startDate,
      search: target.driver.fullName.toLocaleUpperCase(),
      status: target.assignment.status,
    });

    expect(rows.map(({ assignment }) => assignment.id)).toEqual([
      target.assignment.id,
    ]);
  });

  it("combines mileage-log identity, date, and odometer ranges", () => {
    const source = reportService.getReports(MOCK_FLEET_DATA).recentMileageLogs;
    const target = source[0];
    const reading = String(target.mileageLog.odometerReading);
    const rows = recordFilterService.filterMileageLogs(source, {
      dateFrom: target.mileageLog.logDate,
      dateTo: target.mileageLog.logDate,
      mileageFrom: reading,
      mileageTo: reading,
      search: target.vehicle.plateNumber.toLocaleUpperCase(),
    });

    expect(rows.map(({ mileageLog }) => mileageLog.id)).toEqual([
      target.mileageLog.id,
    ]);
  });

  it("combines maintenance status/date search and completed-service mileage filters", () => {
    const workOrders = operationsViewService.getWorkOrders(MOCK_FLEET_DATA);
    const workTarget = workOrders[0];
    const filteredWork = recordFilterService.filterWorkOrders(workOrders, {
      dateFrom: workTarget.workOrder.scheduledDate,
      dateTo: workTarget.workOrder.scheduledDate,
      search: workTarget.serviceType.name.toLocaleUpperCase(),
      status: workTarget.workOrder.status,
    });

    expect(filteredWork.map(({ workOrder }) => workOrder.id)).toEqual([
      workTarget.workOrder.id,
    ]);

    const history = operationsViewService.getServiceHistory(MOCK_FLEET_DATA);
    const historyTarget = history[0];
    const serviceMileage = String(historyTarget.history.odometerAtService);
    const filteredHistory = recordFilterService.filterServiceHistory(history, {
      dateFrom: historyTarget.history.serviceDate,
      dateTo: historyTarget.history.serviceDate,
      mileageFrom: serviceMileage,
      mileageTo: serviceMileage,
      search: historyTarget.vehicle.plateNumber.toLocaleUpperCase(),
    });

    expect(filteredHistory.map(({ history: record }) => record.id)).toEqual([
      historyTarget.history.id,
    ]);
  });

  it("returns an empty result when combined filters have no current-record match", () => {
    const rows = recordFilterService.filterServiceHistory(
      operationsViewService.getServiceHistory(MOCK_FLEET_DATA),
      {
        dateFrom: "2099-01-01",
        dateTo: "2099-12-31",
        mileageFrom: "999999999",
        mileageTo: "999999999",
        search: "no-such-vehicle-or-service",
      },
    );

    expect(rows).toEqual([]);
  });
});
