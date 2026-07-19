import type { Priority, WorkOrderStatus } from "./fleet";

export type OperationsErrorCode =
  | "assignment_conflict"
  | "ineligible_driver"
  | "invalid_date"
  | "invalid_record"
  | "invalid_transition"
  | "not_found"
  | "unauthorized"
  | "unavailable_vehicle";

export class OperationsError extends Error {
  public readonly code: OperationsErrorCode;

  public constructor(code: OperationsErrorCode, message: string) {
    super(message);
    this.name = "OperationsError";
    this.code = code;
  }
}

export interface AssignmentInput {
  driverProfileId: string;
  startDate: string;
  vehicleId: string;
}

export interface MaintenanceScheduleInput {
  dueDate: string;
  mechanicProfileId?: string;
  notes: string;
  serviceTypeId: string;
  vehicleId: string;
}

export interface WorkOrderInput {
  mechanicProfileId?: string;
  notes: string;
  priority: Priority;
  scheduleId?: string;
  scheduledDate: string;
  serviceTypeId: string;
  vehicleId: string;
}

export interface WorkOrderTransitionInput {
  actorUserId: string;
  serviceNotes?: string;
  status: WorkOrderStatus;
}

export interface ServiceTypeInput {
  description: string;
  name: string;
}
