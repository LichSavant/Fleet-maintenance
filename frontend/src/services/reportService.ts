import { USER_ROLES, type UserRole } from "../types/auth";
import {
  VEHICLE_STATUSES,
  type AssignmentStatus,
  type FleetState,
  type MaintenanceHistoryRecord,
  type MaintenanceWorkOrder,
  type MileageMaintenanceStatus,
  type ServiceType,
  type User,
  type Vehicle,
  type VehicleAssignment,
  type VehicleServiceMileageStatus,
  type VehicleStatus,
  type WorkOrderStatus,
} from "../types/fleet";
import { matchesDateRange, matchesSearch } from "../utils/filtering";
import { formatRole } from "../utils/roleRoutes";
import { formatStatus } from "../utils/formatStatus";
import { mileageService } from "./mileageService";

const SERVICE_STATUSES: readonly MileageMaintenanceStatus[] = [
  "UPCOMING",
  "DUE_SOON",
  "DUE_NOW",
  "OVERDUE",
  "NO_HISTORY",
];

const WORK_ORDER_STATUSES: readonly WorkOrderStatus[] = [
  "scheduled",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
];

const ASSIGNMENT_STATUSES: readonly AssignmentStatus[] = ["Active", "Ended"];

export interface ReportBreakdownItem {
  label: string;
  value: number;
}

export interface ReportFilters {
  assignmentSearch?: string;
  assignmentStatus?: AssignmentStatus | "all";
  historyDateFrom?: string;
  historyDateTo?: string;
  historySearch?: string;
  inventorySearch?: string;
  inventoryStatus?: VehicleStatus | "all";
  mileageSearch?: string;
  serviceSearch?: string;
  serviceTypeId?: string | "all";
}

export interface VehicleInventoryReportRow {
  assignedDriver?: User;
  vehicle: Vehicle;
}

export interface MaintenanceHistoryReportRow {
  history: MaintenanceHistoryRecord;
  mechanic?: User;
  serviceType: ServiceType;
  vehicle: Vehicle;
}

export interface MaintenanceCostReportRow {
  recordCount: number;
  serviceType: ServiceType;
  totalCost: number;
}

export interface MileageByVehicleReportRow {
  currentMileage: number;
  latestLogDate: string | null;
  latestLoggedMileage: number | null;
  logCount: number;
  loggedDistanceKm: number;
  vehicle: Vehicle;
}

export interface ServiceMileageReportRow {
  calculation: VehicleServiceMileageStatus;
  serviceType: ServiceType;
  vehicle: Vehicle;
}

export interface DriverAssignmentReportRow {
  assignment: VehicleAssignment;
  driver: User;
  vehicle: Vehicle;
}

export interface MileageLogReportView {
  driver: User;
  mileageLog: FleetState["mileageLogs"][number];
  vehicle: Vehicle;
}

function getUser(data: FleetState, userId: string) {
  return data.users.find((user) => user.id === userId);
}

function getAssignedDriver(data: FleetState, vehicleId: string) {
  const assignment = data.assignments.find(
    (item) => item.vehicleId === vehicleId && item.status === "Active",
  );
  const profile = assignment
    ? data.driverProfiles.find((item) => item.id === assignment.driverId)
    : undefined;
  return profile ? getUser(data, profile.userId) : undefined;
}

function getMechanic(data: FleetState, mechanicId: string) {
  const profile = data.mechanicProfiles.find((item) => item.id === mechanicId);
  return profile ? getUser(data, profile.userId) : undefined;
}

function getDriver(data: FleetState, driverId: string) {
  const profile = data.driverProfiles.find((item) => item.id === driverId);
  return profile ? getUser(data, profile.userId) : undefined;
}

function countKnownValues<T extends string>(
  values: readonly T[],
  items: readonly { status: T }[],
  formatLabel: (value: T) => string = (value) => value,
): ReportBreakdownItem[] {
  return values.map((value) => ({
    label: formatLabel(value),
    value: items.filter((item) => item.status === value).length,
  }));
}

function getMileageLogs(data: FleetState): MileageLogReportView[] {
  return [...data.mileageLogs]
    .sort((left, right) => right.logDate.localeCompare(left.logDate))
    .flatMap<MileageLogReportView>((mileageLog) => {
      const driver = getDriver(data, mileageLog.driverId);
      const vehicle = data.vehicles.find(
        (item) => item.id === mileageLog.vehicleId,
      );
      return driver && vehicle ? [{ driver, mileageLog, vehicle }] : [];
    });
}

function getVehicleInventoryReport(data: FleetState, filters: ReportFilters) {
  const rows = data.vehicles
    .map<VehicleInventoryReportRow>((vehicle) => ({
      assignedDriver: getAssignedDriver(data, vehicle.id),
      vehicle,
    }))
    .filter(
      ({ assignedDriver, vehicle }) =>
        matchesSearch(filters.inventorySearch ?? "", [
          vehicle.fleetNumber,
          vehicle.plateNumber,
          vehicle.vin,
          vehicle.make,
          vehicle.model,
          vehicle.status,
          assignedDriver?.fullName,
        ]) &&
        (!filters.inventoryStatus ||
          filters.inventoryStatus === "all" ||
          vehicle.status === filters.inventoryStatus),
    )
    .sort((left, right) =>
      left.vehicle.fleetNumber.localeCompare(right.vehicle.fleetNumber),
    );

  return {
    byStatus: countKnownValues(
      VEHICLE_STATUSES,
      rows.map(({ vehicle }) => ({ status: vehicle.status })),
    ),
    rows,
    sourceTotal: data.vehicles.length,
    total: rows.length,
  };
}

function getMaintenanceHistoryReport(data: FleetState, filters: ReportFilters) {
  const rows = data.maintenanceHistory
    .flatMap<MaintenanceHistoryReportRow>((history) => {
      const vehicle = data.vehicles.find(
        (item) => item.id === history.vehicleId,
      );
      const serviceType = data.serviceTypes.find(
        (item) => item.id === history.serviceTypeId,
      );
      return vehicle && serviceType
        ? [
            {
              history,
              mechanic: getMechanic(data, history.mechanicId),
              serviceType,
              vehicle,
            },
          ]
        : [];
    })
    .filter(
      ({ mechanic, serviceType, vehicle, history }) =>
        matchesSearch(filters.historySearch ?? "", [
          vehicle.fleetNumber,
          vehicle.plateNumber,
          serviceType.name,
          mechanic?.fullName,
        ]) &&
        matchesDateRange(
          history.serviceDate,
          filters.historyDateFrom ?? "",
          filters.historyDateTo ?? "",
        ),
    )
    .sort((left, right) =>
      right.history.serviceDate.localeCompare(left.history.serviceDate),
    );

  const costByServiceType = data.serviceTypes
    .flatMap<MaintenanceCostReportRow>((serviceType) => {
      const records = rows.filter(
        ({ history }) => history.serviceTypeId === serviceType.id,
      );
      return records.length
        ? [
            {
              recordCount: records.length,
              serviceType,
              totalCost: records.reduce(
                (total, { history }) => total + history.totalCost,
                0,
              ),
            },
          ]
        : [];
    })
    .sort(
      (left, right) =>
        right.totalCost - left.totalCost ||
        left.serviceType.name.localeCompare(right.serviceType.name),
    );
  const totalCost = rows.reduce(
    (total, { history }) => total + history.totalCost,
    0,
  );

  return {
    averageCost: rows.length ? totalCost / rows.length : 0,
    costByServiceType,
    rows,
    sourceTotal: data.maintenanceHistory.length,
    totalCost,
    totalRecords: rows.length,
  };
}

function getMileageByVehicleReport(data: FleetState, filters: ReportFilters) {
  const rows = data.vehicles
    .filter((vehicle) =>
      matchesSearch(filters.mileageSearch ?? "", [
        vehicle.fleetNumber,
        vehicle.plateNumber,
        vehicle.make,
        vehicle.model,
      ]),
    )
    .map<MileageByVehicleReportRow>((vehicle) => {
      const logs = data.mileageLogs.filter(
        (log) => log.vehicleId === vehicle.id,
      );
      const readings = logs.map((log) => log.odometerReading);
      const latestLog = [...logs].sort(
        (left, right) =>
          right.odometerReading - left.odometerReading ||
          right.logDate.localeCompare(left.logDate),
      )[0];
      return {
        currentMileage: vehicle.currentMileage,
        latestLogDate: latestLog?.logDate ?? null,
        latestLoggedMileage: latestLog?.odometerReading ?? null,
        logCount: logs.length,
        loggedDistanceKm:
          readings.length > 1
            ? Math.max(...readings) - Math.min(...readings)
            : 0,
        vehicle,
      };
    })
    .sort((left, right) =>
      left.vehicle.fleetNumber.localeCompare(right.vehicle.fleetNumber),
    );

  return {
    combinedCurrentOdometers: rows.reduce(
      (total, row) => total + row.currentMileage,
      0,
    ),
    rows,
    sourceTotal: data.vehicles.length,
    totalLoggedDistance: rows.reduce(
      (total, row) => total + row.loggedDistanceKm,
      0,
    ),
    totalLogs: rows.reduce((total, row) => total + row.logCount, 0),
    totalVehicles: rows.length,
  };
}

function getServiceMileageReports(data: FleetState, filters: ReportFilters) {
  const rows = mileageService
    .getFleetServiceStatuses(data)
    .flatMap<ServiceMileageReportRow>((calculation) => {
      const vehicle = data.vehicles.find(
        (item) => item.id === calculation.vehicleId,
      );
      const serviceType = data.serviceTypes.find(
        (item) => item.id === calculation.serviceTypeId,
      );
      return vehicle && serviceType
        ? [{ calculation, serviceType, vehicle }]
        : [];
    })
    .filter(
      ({ serviceType, vehicle }) =>
        matchesSearch(filters.serviceSearch ?? "", [
          vehicle.fleetNumber,
          vehicle.plateNumber,
          vehicle.make,
          vehicle.model,
          serviceType.name,
        ]) &&
        (!filters.serviceTypeId ||
          filters.serviceTypeId === "all" ||
          serviceType.id === filters.serviceTypeId),
    );

  const getByStatus = (status: MileageMaintenanceStatus) =>
    rows
      .filter((row) => row.calculation.status === status)
      .sort(
        (left, right) =>
          (left.calculation.remainingDistance ?? Number.POSITIVE_INFINITY) -
            (right.calculation.remainingDistance ?? Number.POSITIVE_INFINITY) ||
          left.vehicle.fleetNumber.localeCompare(right.vehicle.fleetNumber),
      );

  return {
    byStatus: SERVICE_STATUSES.map((status) => ({
      label: formatStatus(status),
      value: rows.filter((row) => row.calculation.status === status).length,
    })),
    dueNow: getByStatus("DUE_NOW"),
    dueSoon: getByStatus("DUE_SOON"),
    noHistory: getByStatus("NO_HISTORY"),
    overdue: getByStatus("OVERDUE"),
    sourceTotal:
      data.vehicles.length *
      data.serviceTypes.filter((serviceType) => serviceType.status === "Active")
        .length,
    total: rows.length,
    upcoming: getByStatus("UPCOMING"),
  };
}

function getDriverAssignmentReport(data: FleetState, filters: ReportFilters) {
  const rows = data.assignments
    .flatMap<DriverAssignmentReportRow>((assignment) => {
      const driver = getDriver(data, assignment.driverId);
      const vehicle = data.vehicles.find(
        (item) => item.id === assignment.vehicleId,
      );
      return driver && vehicle ? [{ assignment, driver, vehicle }] : [];
    })
    .filter(
      ({ assignment, driver, vehicle }) =>
        matchesSearch(filters.assignmentSearch ?? "", [
          driver.fullName,
          vehicle.fleetNumber,
          vehicle.plateNumber,
          assignment.status,
          assignment.status === "Ended" ? "historical" : undefined,
        ]) &&
        (!filters.assignmentStatus ||
          filters.assignmentStatus === "all" ||
          assignment.status === filters.assignmentStatus),
    )
    .sort((left, right) =>
      right.assignment.startDate.localeCompare(left.assignment.startDate),
    );

  return {
    byStatus: countKnownValues(
      ASSIGNMENT_STATUSES,
      rows.map(({ assignment }) => ({ status: assignment.status })),
    ),
    rows,
    sourceTotal: data.assignments.length,
    total: rows.length,
  };
}

function getWorkOrderStatusReport(data: FleetState) {
  return {
    byStatus: countKnownValues(
      WORK_ORDER_STATUSES,
      data.maintenanceWorkOrders.map((workOrder: MaintenanceWorkOrder) => ({
        status: workOrder.status,
      })),
      formatStatus,
    ),
    total: data.maintenanceWorkOrders.length,
  };
}

function getUserRoleReport(data: FleetState) {
  return {
    byRole: USER_ROLES.map((role: UserRole) => ({
      label: formatRole(role),
      value: data.users.filter((user) => user.role === role).length,
    })),
    total: data.users.length,
  };
}

export const reportService = {
  getReports(data: FleetState, filters: ReportFilters = {}) {
    return {
      assignments: getDriverAssignmentReport(data, filters),
      maintenanceHistory: getMaintenanceHistoryReport(data, filters),
      mileageByVehicle: getMileageByVehicleReport(data, filters),
      recentMileageLogs: getMileageLogs(data),
      services: getServiceMileageReports(data, filters),
      userRoles: getUserRoleReport(data),
      vehicleInventory: getVehicleInventoryReport(data, filters),
      workOrders: getWorkOrderStatusReport(data),
    };
  },
};
