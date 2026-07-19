import type {
  DriverManagementRecord,
  MechanicManagementRecord,
  VehicleManagementRecord,
} from "../types/management";
import type {
  AssignmentOperationalView,
  ServiceHistoryOperationalView,
  WorkOrderOperationalView,
} from "./operationsViewService";
import type { MileageLogReportView } from "./reportService";

export interface TextFilter {
  search: string;
}

export interface DateRangeFilter {
  dateFrom: string;
  dateTo: string;
}

export interface MileageRangeFilter {
  mileageFrom: string;
  mileageTo: string;
}

export interface VehicleFilters extends TextFilter {
  status: string;
  type: string;
}

export interface DriverFilters extends TextFilter {
  assignment: string;
  status: string;
}

export interface MechanicFilters extends TextFilter {
  status: string;
  work: string;
}

export interface AssignmentFilters extends TextFilter, DateRangeFilter {
  status: string;
}

export interface MileageLogFilters
  extends TextFilter, DateRangeFilter, MileageRangeFilter {}

export interface WorkOrderFilters extends TextFilter, DateRangeFilter {
  status: string;
}

export interface ServiceHistoryFilters
  extends TextFilter, DateRangeFilter, MileageRangeFilter {}

function normalize(value: string | number | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase();
}

function matchesSearch(
  search: string,
  values: readonly (string | number | null | undefined)[],
) {
  const query = normalize(search);
  return !query || values.some((value) => normalize(value).includes(query));
}

function matchesDateRange(value: string, from: string, to: string) {
  return (!from || value >= from) && (!to || value <= to);
}

function optionalNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function matchesMileageRange(value: number, from: string, to: string) {
  const minimum = optionalNumber(from);
  const maximum = optionalNumber(to);
  return (
    (minimum === undefined || value >= minimum) &&
    (maximum === undefined || value <= maximum)
  );
}

export const recordFilterService = {
  filterVehicles(
    records: readonly VehicleManagementRecord[],
    filters: VehicleFilters,
  ) {
    return records.filter(
      ({ assignedDriver, vehicle }) =>
        matchesSearch(filters.search, [
          vehicle.fleetNumber,
          vehicle.plateNumber,
          vehicle.vin,
          vehicle.make,
          vehicle.model,
          vehicle.status,
          assignedDriver?.fullName,
        ]) &&
        (filters.status === "all" || vehicle.status === filters.status) &&
        (filters.type === "all" || vehicle.type === filters.type),
    );
  },

  filterDrivers(
    records: readonly DriverManagementRecord[],
    filters: DriverFilters,
  ) {
    return records.filter(
      ({ activeAssignment, assignedVehicle, profile, user }) => {
        const displayedStatus =
          user.status === "Inactive" ? "Inactive" : profile.status;
        return (
          matchesSearch(filters.search, [
            user.fullName,
            user.email,
            profile.employeeNumber,
            profile.licenseNumber,
            displayedStatus,
            assignedVehicle?.fleetNumber,
            assignedVehicle?.plateNumber,
            assignedVehicle?.make,
            assignedVehicle?.model,
          ]) &&
          (filters.status === "all" || displayedStatus === filters.status) &&
          (filters.assignment === "all" ||
            (filters.assignment === "assigned" && Boolean(activeAssignment)) ||
            (filters.assignment === "available" && !activeAssignment))
        );
      },
    );
  },

  filterMechanics(
    records: readonly MechanicManagementRecord[],
    filters: MechanicFilters,
  ) {
    return records.filter(
      ({ openWork, profile, user }) =>
        matchesSearch(filters.search, [
          user.fullName,
          user.email,
          profile.employeeNumber,
          profile.specialization,
          user.status,
        ]) &&
        (filters.status === "all" || user.status === filters.status) &&
        (filters.work === "all" ||
          (filters.work === "open" && openWork > 0) ||
          (filters.work === "clear" && openWork === 0)),
    );
  },

  filterAssignments(
    records: readonly AssignmentOperationalView[],
    filters: AssignmentFilters,
  ) {
    return records.filter(
      ({ assignment, driver, vehicle }) =>
        matchesSearch(filters.search, [
          driver.fullName,
          vehicle.fleetNumber,
          vehicle.plateNumber,
          vehicle.make,
          vehicle.model,
          assignment.status,
          assignment.status === "Ended" ? "historical" : undefined,
        ]) &&
        (filters.status === "all" || assignment.status === filters.status) &&
        matchesDateRange(
          assignment.startDate,
          filters.dateFrom,
          filters.dateTo,
        ),
    );
  },

  filterMileageLogs(
    records: readonly MileageLogReportView[],
    filters: MileageLogFilters,
  ) {
    return records.filter(
      ({ driver, mileageLog, vehicle }) =>
        matchesSearch(filters.search, [
          vehicle.fleetNumber,
          vehicle.plateNumber,
          driver.fullName,
        ]) &&
        matchesDateRange(
          mileageLog.logDate,
          filters.dateFrom,
          filters.dateTo,
        ) &&
        matchesMileageRange(
          mileageLog.odometerReading,
          filters.mileageFrom,
          filters.mileageTo,
        ),
    );
  },

  filterWorkOrders(
    records: readonly WorkOrderOperationalView[],
    filters: WorkOrderFilters,
  ) {
    return records.filter(
      ({ mechanic, serviceType, vehicle, workOrder }) =>
        matchesSearch(filters.search, [
          vehicle.fleetNumber,
          vehicle.plateNumber,
          serviceType.name,
          mechanic?.fullName,
          workOrder.status,
          workOrder.status.replaceAll("_", " "),
        ]) &&
        (filters.status === "all" || workOrder.status === filters.status) &&
        matchesDateRange(
          workOrder.scheduledDate,
          filters.dateFrom,
          filters.dateTo,
        ),
    );
  },

  filterServiceHistory(
    records: readonly ServiceHistoryOperationalView[],
    filters: ServiceHistoryFilters,
  ) {
    return records.filter(
      ({ history, mechanic, serviceType, vehicle }) =>
        matchesSearch(filters.search, [
          vehicle.fleetNumber,
          vehicle.plateNumber,
          serviceType.name,
          mechanic?.fullName,
          "completed",
        ]) &&
        matchesDateRange(
          history.serviceDate,
          filters.dateFrom,
          filters.dateTo,
        ) &&
        matchesMileageRange(
          history.odometerAtService,
          filters.mileageFrom,
          filters.mileageTo,
        ),
    );
  },
};
