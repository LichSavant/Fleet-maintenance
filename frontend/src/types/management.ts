import type { UserRole } from "./auth";
import type {
  DriverProfile,
  FleetUserRecord,
  MechanicProfile,
  UserStatus,
  Vehicle,
  VehicleAssignment,
  VehicleStatus,
} from "./fleet";

export type ManagementErrorCode =
  | "duplicate_email"
  | "duplicate_fleet_number"
  | "duplicate_license"
  | "duplicate_plate"
  | "invalid_record"
  | "linked_record"
  | "not_found"
  | "self_deactivation"
  | "storage_unavailable";

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
  fullName: string;
  licenseNumber?: string;
  role: UserRole;
  specialty?: string;
}

export interface UserAccountUpdateInput {
  depot?: string;
  email: string;
  fullName: string;
  licenseNumber?: string;
  specialty?: string;
}

export interface DriverAccountInput {
  email: string;
  fullName: string;
  licenseNumber: string;
}

export interface MechanicAccountInput {
  email: string;
  fullName: string;
  specialty: string;
}

export interface VehicleInput {
  fleetNumber: string;
  manufacturer: string;
  mileage: number;
  model: string;
  plate: string;
  status: VehicleStatus;
  type: string;
  year: number;
}

export interface AccountStatusView {
  status: UserStatus;
}

export interface UserManagementRecord {
  profileDetail: string;
  user: FleetUserRecord;
}

export interface DriverManagementRecord {
  activeAssignment?: VehicleAssignment;
  assignedVehicle?: Vehicle;
  profile: DriverProfile;
  user: FleetUserRecord;
}

export interface MechanicManagementRecord {
  completedWork: number;
  openWork: number;
  profile: MechanicProfile;
  user: FleetUserRecord;
}

export interface VehicleManagementRecord {
  assignedDriver?: FleetUserRecord;
  lastServiceDate?: string;
  nextServiceDate?: string;
  vehicle: Vehicle;
}
