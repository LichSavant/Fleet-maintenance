import type { UserRole } from "./auth";
import type {
  DriverProfile,
  MechanicProfile,
  User,
  UserStatus,
  Vehicle,
  VehicleServiceMileageStatus,
  VehicleAssignment,
  VehicleStatus,
} from "./fleet";

export type ManagementErrorCode =
  | "duplicate_email"
  | "duplicate_employee_number"
  | "duplicate_fleet_number"
  | "duplicate_license"
  | "duplicate_plate"
  | "duplicate_vin"
  | "invalid_record"
  | "linked_record"
  | "not_found"
  | "self_deactivation"
  | "storage_unavailable"
  | "unauthorized";

export class ManagementError extends Error {
  code: ManagementErrorCode;

  constructor(code: ManagementErrorCode, message: string) {
    super(message);
    this.name = "ManagementError";
    this.code = code;
  }
}

export interface UserAccountInput {
  depot?: string;
  email: string;
  employeeNumber?: string;
  fullName: string;
  licenseNumber?: string;
  phone?: string;
  role: UserRole;
  specialization?: string;
}

export interface UserAccountUpdateInput {
  depot?: string;
  email: string;
  employeeNumber?: string;
  fullName: string;
  licenseNumber?: string;
  phone?: string;
  specialization?: string;
}

export interface DriverAccountInput {
  email: string;
  employeeNumber?: string;
  fullName: string;
  licenseNumber: string;
  phone?: string;
}

export interface MechanicAccountInput {
  email: string;
  employeeNumber?: string;
  fullName: string;
  phone?: string;
  specialization: string;
}

export interface VehicleInput {
  currentMileage: number;
  fleetNumber: string;
  make: string;
  model: string;
  plateNumber: string;
  status: VehicleStatus;
  type: string;
  vin: string;
  year: number;
}

export interface AccountStatusView {
  status: UserStatus;
}

export interface UserManagementRecord {
  profileDetail: string;
  user: User;
}

export interface DriverManagementRecord {
  activeAssignment?: VehicleAssignment;
  assignedVehicle?: Vehicle;
  profile: DriverProfile;
  user: User;
}

export interface MechanicManagementRecord {
  completedWork: number;
  openWork: number;
  profile: MechanicProfile;
  user: User;
}

export interface VehicleManagementRecord {
  assignedDriver?: User;
  serviceStatuses: readonly VehicleServiceMileageStatus[];
  vehicle: Vehicle;
}
