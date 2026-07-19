import type { UserRole } from "./auth";

export type UserStatus = "Active" | "Inactive";
export type VehicleStatus =
  "Active" | "Maintenance" | "Inspection" | "Out of Service";
export type AssignmentStatus = "Active" | "Ended";
export type WorkOrderStatus =
  "scheduled" | "assigned" | "in_progress" | "completed" | "cancelled";
export type ScheduleStatus = "Overdue" | "Upcoming" | "Converted" | "Cancelled";
export type Priority = "Low" | "Medium" | "High";

export interface FleetUserRecord {
  email: string;
  fullName: string;
  id: string;
  role: UserRole;
  status: UserStatus;
}

export interface ManagerProfile {
  depot: string;
  id: string;
  userId: string;
}

export interface MechanicProfile {
  id: string;
  specialty: string;
  status: UserStatus;
  userId: string;
}

export interface DriverProfile {
  id: string;
  licenseNumber: string;
  status: "Assigned" | "Available" | "Inactive";
  userId: string;
}

export interface Vehicle {
  fleetNumber: string;
  health: number;
  id: string;
  manufacturer: string;
  mileage: number;
  model: string;
  plate: string;
  status: VehicleStatus;
  type: string;
  year: number;
}

export interface VehicleAssignment {
  driverProfileId: string;
  endDate: string | null;
  id: string;
  startDate: string;
  status: AssignmentStatus;
  vehicleId: string;
}

export interface MaintenanceRecord {
  completedDate: string | null;
  createdAt: string;
  createdByUserId: string;
  id: string;
  mechanicProfileId: string | null;
  notes: string;
  priority: Priority;
  scheduleId: string | null;
  scheduledDate: string;
  serviceNotes: string;
  serviceTypeId: string;
  status: WorkOrderStatus;
  vehicleId: string;
}

export interface MaintenanceSchedule {
  createdAt: string;
  createdByUserId: string;
  dueDate: string;
  id: string;
  mechanicProfileId: string | null;
  notes: string;
  serviceTypeId: string;
  status: ScheduleStatus;
  vehicleId: string;
  workOrderId: string | null;
}

export interface ServiceType {
  active: boolean;
  description: string;
  id: string;
  name: string;
}

export interface MileageSubmission {
  driverProfileId: string;
  id: string;
  mileage: number;
  notes: string;
  submittedAt: string;
  vehicleId: string;
}

export interface FleetNotification {
  createdAt: string;
  destination: string;
  id: string;
  message: string;
  read: boolean;
  role?: UserRole;
  title: string;
  type:
    | "Assignment"
    | "Maintenance"
    | "Mileage"
    | "Reminder"
    | "Schedule"
    | "System";
  userId?: string;
}

export interface SystemActivity {
  action: string;
  entityLabel: string;
  id: string;
  occurredAt: string;
  userId: string;
}

export interface FleetDataSource {
  assignments: readonly VehicleAssignment[];
  driverProfiles: readonly DriverProfile[];
  maintenanceRecords: readonly MaintenanceRecord[];
  maintenanceSchedules: readonly MaintenanceSchedule[];
  managerProfiles: readonly ManagerProfile[];
  mechanicProfiles: readonly MechanicProfile[];
  mileageSubmissions: readonly MileageSubmission[];
  notifications: readonly FleetNotification[];
  serviceTypes: readonly ServiceType[];
  systemActivity: readonly SystemActivity[];
  users: readonly FleetUserRecord[];
  vehicles: readonly Vehicle[];
}
