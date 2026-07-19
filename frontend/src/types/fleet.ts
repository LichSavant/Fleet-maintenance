import type { UserRole } from "./auth";

export type RecordStatus = "Active" | "Inactive";
export type UserStatus = RecordStatus;
export type DriverStatus = "Assigned" | "Available" | "Inactive";
export const VEHICLE_STATUSES = [
  "Active",
  "Maintenance",
  "Inspection",
  "Out of Service",
] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];
export type AssignmentStatus = "Active" | "Ended";
export type WorkOrderStatus =
  "scheduled" | "assigned" | "in_progress" | "completed" | "cancelled";
export type ScheduleStatus = "Planned" | "Converted" | "Cancelled";
export type Priority = "Low" | "Medium" | "High";
export type NotificationType =
  "Assignment" | "Maintenance" | "Mileage" | "Reminder" | "Schedule" | "System";
export type MileageMaintenanceStatus =
  "UPCOMING" | "DUE_SOON" | "DUE_NOW" | "OVERDUE" | "NO_HISTORY";
export type AuditEntityType =
  | "assignment"
  | "maintenance_history"
  | "maintenance_schedule"
  | "maintenance_work_order"
  | "mileage_log"
  | "notification"
  | "profile"
  | "service_type"
  | "user"
  | "vehicle";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export interface DriverProfile {
  id: string;
  userId: string;
  employeeNumber: string;
  licenseNumber: string;
  phone: string;
  status: DriverStatus;
}

export interface MechanicProfile {
  id: string;
  userId: string;
  employeeNumber: string;
  specialization: string;
  phone: string;
  status: RecordStatus;
}

export interface ManagerProfile {
  id: string;
  userId: string;
  depot: string;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  currentMileage: number;
  status: VehicleStatus;
  fleetNumber: string;
  type: string;
}

export interface VehicleAssignment {
  id: string;
  driverId: string;
  vehicleId: string;
  startDate: string;
  endDate: string | null;
  status: AssignmentStatus;
}

export interface MileageLog {
  id: string;
  vehicleId: string;
  driverId: string;
  odometerReading: number;
  logDate: string;
  notes: string;
}

export interface VehicleServiceMileageStatus {
  vehicleId: string;
  serviceTypeId: string;
  currentMileage: number;
  lastCompletedServiceMileage: number | null;
  recommendedIntervalKm: number;
  nextServiceMileage: number | null;
  remainingDistance: number | null;
  status: MileageMaintenanceStatus;
}

export interface ServiceType {
  id: string;
  name: string;
  description: string;
  recommendedIntervalKm: number;
  status: RecordStatus;
}

export interface MaintenanceWorkOrder {
  id: string;
  vehicleId: string;
  serviceTypeId: string;
  assignedMechanicId: string | null;
  requestedByUserId: string;
  status: WorkOrderStatus;
  scheduledDate: string;
  notes: string;
  priority: Priority;
  scheduleId: string | null;
  serviceNotes: string;
  createdAt: string;
}

export interface MaintenanceHistoryRecord {
  id: string;
  vehicleId: string;
  serviceTypeId: string;
  mechanicId: string;
  workOrderId: string;
  serviceDate: string;
  odometerAtService: number;
  totalCost: number;
  notes: string;
}

/** Manual planning metadata. Its date never determines mileage-based urgency. */
export interface MaintenanceSchedule {
  id: string;
  vehicleId: string;
  serviceTypeId: string;
  assignedMechanicId: string | null;
  requestedByUserId: string;
  dueDate: string;
  status: ScheduleStatus;
  notes: string;
  createdAt: string;
  workOrderId: string | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  relatedRoute: string;
}

export interface AuditEvent {
  id: string;
  userId: string;
  role: UserRole;
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  description: string;
  createdAt: string;
}

export interface FleetState {
  users: readonly User[];
  driverProfiles: readonly DriverProfile[];
  mechanicProfiles: readonly MechanicProfile[];
  managerProfiles: readonly ManagerProfile[];
  vehicles: readonly Vehicle[];
  assignments: readonly VehicleAssignment[];
  mileageLogs: readonly MileageLog[];
  serviceTypes: readonly ServiceType[];
  maintenanceWorkOrders: readonly MaintenanceWorkOrder[];
  maintenanceHistory: readonly MaintenanceHistoryRecord[];
  maintenanceSchedules: readonly MaintenanceSchedule[];
  notifications: readonly Notification[];
  auditEvents: readonly AuditEvent[];
}
