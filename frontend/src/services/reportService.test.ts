import { describe, expect, it } from "vitest";

import { MOCK_FLEET_DATA } from "../data/mockFleetData";
import type { FleetState } from "../types/fleet";
import { mileageService } from "./mileageService";
import { reportService } from "./reportService";

function sumValues(items: readonly { value: number }[]) {
  return items.reduce((total, item) => total + item.value, 0);
}

describe("reportService", () => {
  it("calculates all ten required report bases from centralized records", () => {
    const reports = reportService.getReports(MOCK_FLEET_DATA);

    expect(reports.vehicleInventory.rows).toHaveLength(
      MOCK_FLEET_DATA.vehicles.length,
    );
    expect(sumValues(reports.vehicleInventory.byStatus)).toBe(
      reports.vehicleInventory.total,
    );
    expect(reports.maintenanceHistory.rows).toHaveLength(
      MOCK_FLEET_DATA.maintenanceHistory.length,
    );
    expect(reports.mileageByVehicle.rows).toHaveLength(
      MOCK_FLEET_DATA.vehicles.length,
    );
    expect(
      reports.services.upcoming.every(
        (row) => row.calculation.status === "UPCOMING",
      ),
    ).toBe(true);
    expect(
      reports.services.dueSoon.every(
        (row) => row.calculation.status === "DUE_SOON",
      ),
    ).toBe(true);
    expect(
      reports.services.overdue.every(
        (row) => row.calculation.status === "OVERDUE",
      ),
    ).toBe(true);
    expect(reports.assignments.rows).toHaveLength(
      MOCK_FLEET_DATA.assignments.length,
    );
    expect(sumValues(reports.workOrders.byStatus)).toBe(
      MOCK_FLEET_DATA.maintenanceWorkOrders.length,
    );
    expect(sumValues(reports.userRoles.byRole)).toBe(
      MOCK_FLEET_DATA.users.length,
    );
  });

  it("calculates maintenance costs from filtered maintenance-history records", () => {
    const maintenanceHistory = MOCK_FLEET_DATA.maintenanceHistory.map(
      (record, index) => ({ ...record, totalCost: (index + 1) * 1250.5 }),
    );
    const data: FleetState = { ...MOCK_FLEET_DATA, maintenanceHistory };
    const target = maintenanceHistory[0];
    const reports = reportService.getReports(data, {
      historyDateFrom: target.serviceDate,
      historyDateTo: target.serviceDate,
      historySearch: data.vehicles.find(
        (vehicle) => vehicle.id === target.vehicleId,
      )?.plateNumber,
    });
    const expectedRows = maintenanceHistory.filter(
      (record) =>
        record.serviceDate === target.serviceDate &&
        record.vehicleId === target.vehicleId,
    );
    const expectedCost = expectedRows.reduce(
      (total, record) => total + record.totalCost,
      0,
    );

    expect(reports.maintenanceHistory.totalRecords).toBe(expectedRows.length);
    expect(reports.maintenanceHistory.totalCost).toBe(expectedCost);
    expect(reports.maintenanceHistory.averageCost).toBe(
      expectedRows.length ? expectedCost / expectedRows.length : 0,
    );
    expect(
      reports.maintenanceHistory.costByServiceType.reduce(
        (total, row) => total + row.totalCost,
        0,
      ),
    ).toBe(expectedCost);
  });

  it("calculates mileage per vehicle without summing odometers as distance", () => {
    const reports = reportService.getReports(MOCK_FLEET_DATA);

    reports.mileageByVehicle.rows.forEach((row) => {
      const readings = MOCK_FLEET_DATA.mileageLogs
        .filter((log) => log.vehicleId === row.vehicle.id)
        .map((log) => log.odometerReading);
      const expectedDistance =
        readings.length > 1 ? Math.max(...readings) - Math.min(...readings) : 0;

      expect(row.loggedDistanceKm).toBe(expectedDistance);
      expect(row.currentMileage).toBe(row.vehicle.currentMileage);
    });
    expect(reports.mileageByVehicle.combinedCurrentOdometers).toBe(
      MOCK_FLEET_DATA.vehicles.reduce(
        (total, vehicle) => total + vehicle.currentMileage,
        0,
      ),
    );
    expect(reports.mileageByVehicle.totalLoggedDistance).toBe(
      reports.mileageByVehicle.rows.reduce(
        (total, row) => total + row.loggedDistanceKm,
        0,
      ),
    );
  });

  it("uses only mileage calculations for upcoming, due-soon, and overdue reports", () => {
    const changedScheduleData: FleetState = {
      ...MOCK_FLEET_DATA,
      maintenanceSchedules: MOCK_FLEET_DATA.maintenanceSchedules.map(
        (schedule, index) => ({
          ...schedule,
          dueDate: index % 2 ? "1999-01-01" : "2099-12-31",
        }),
      ),
    };
    const reports = reportService.getReports(changedScheduleData);
    const expected =
      mileageService.getFleetServiceStatuses(changedScheduleData);

    expect(reports.services.upcoming).toHaveLength(
      expected.filter((row) => row.status === "UPCOMING").length,
    );
    expect(reports.services.dueSoon).toHaveLength(
      expected.filter((row) => row.status === "DUE_SOON").length,
    );
    expect(reports.services.overdue).toHaveLength(
      expected.filter((row) => row.status === "OVERDUE").length,
    );
    expect(sumValues(reports.services.byStatus)).toBe(expected.length);
  });

  it("combines report filters and returns coherent empty report totals", () => {
    const targetVehicle = MOCK_FLEET_DATA.vehicles[0];
    const filtered = reportService.getReports(MOCK_FLEET_DATA, {
      inventorySearch: targetVehicle.vin.toLocaleUpperCase(),
      inventoryStatus: targetVehicle.status,
      serviceSearch: targetVehicle.plateNumber.toLocaleLowerCase(),
    });

    expect(filtered.vehicleInventory.rows.map((row) => row.vehicle.id)).toEqual(
      [targetVehicle.id],
    );
    expect(
      filtered.services.upcoming
        .concat(
          filtered.services.dueSoon,
          filtered.services.dueNow,
          filtered.services.overdue,
          filtered.services.noHistory,
        )
        .every((row) => row.vehicle.id === targetVehicle.id),
    ).toBe(true);

    const empty = reportService.getReports(MOCK_FLEET_DATA, {
      assignmentSearch: "no-such-driver-or-vehicle",
      historySearch: "no-such-service-record",
      inventorySearch: "no-such-vehicle",
      mileageSearch: "no-such-vehicle",
      serviceSearch: "no-such-service",
    });

    expect(empty.vehicleInventory.total).toBe(0);
    expect(empty.maintenanceHistory.totalRecords).toBe(0);
    expect(empty.maintenanceHistory.totalCost).toBe(0);
    expect(empty.mileageByVehicle.totalVehicles).toBe(0);
    expect(empty.services.total).toBe(0);
    expect(empty.assignments.total).toBe(0);
  });
});
