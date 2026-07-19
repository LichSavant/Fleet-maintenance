import { AuthError } from "../types/auth";
import { ManagementError } from "../types/management";
import { OperationsError } from "../types/operations";
import { SharedFeatureError } from "../types/shared";

interface SupabaseLikeError {
  code?: string;
  details?: string;
  message?: string;
}

function text(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as SupabaseLikeError).message ?? "");
  }
  return String(error ?? "");
}

export function toAuthError(error: unknown): AuthError {
  const message = text(error);
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return new AuthError(
      "invalid_credentials",
      "Email or password is incorrect.",
    );
  }
  if (lower.includes("email not confirmed")) {
    return new AuthError(
      "inactive_account",
      "Confirm your email before signing in.",
    );
  }
  if (
    lower.includes("already registered") ||
    lower.includes("already been registered")
  ) {
    return new AuthError(
      "duplicate_email",
      "That email is already registered.",
    );
  }
  if (lower.includes("administrator and manager")) {
    return new AuthError(
      "registration_restricted",
      "Administrator and Manager accounts must be invited by an administrator.",
    );
  }
  return new AuthError(
    "invalid_registration",
    message || "ForgeFleet could not complete the authentication request.",
  );
}

export function toManagementError(error: unknown): ManagementError {
  const message = text(error);
  const lower = message.toLowerCase();
  if (lower.includes("duplicate") || lower.includes("unique")) {
    return new ManagementError(
      "invalid_record",
      message || "A matching record already exists.",
    );
  }
  if (
    lower.includes("active assignment") ||
    lower.includes("open maintenance")
  ) {
    return new ManagementError("linked_record", message);
  }
  if (lower.includes("not found"))
    return new ManagementError("not_found", message);
  if (lower.includes("cannot deactivate your own")) {
    return new ManagementError("self_deactivation", message);
  }
  return new ManagementError(
    "invalid_record",
    message || "The record could not be saved.",
  );
}

export function toOperationsError(error: unknown): OperationsError {
  const message = text(error);
  const lower = message.toLowerCase();
  if (lower.includes("not found"))
    return new OperationsError("not_found", message);
  if (lower.includes("transition"))
    return new OperationsError("invalid_transition", message);
  if (lower.includes("future") || lower.includes("date"))
    return new OperationsError("invalid_date", message);
  if (lower.includes("available driver"))
    return new OperationsError("ineligible_driver", message);
  if (lower.includes("active vehicle") || lower.includes("available vehicle")) {
    return new OperationsError("unavailable_vehicle", message);
  }
  if (
    lower.includes("already has an active assignment") ||
    lower.includes("conflict")
  ) {
    return new OperationsError("assignment_conflict", message);
  }
  if (
    lower.includes("permission") ||
    lower.includes("unauthorized") ||
    lower.includes("row-level security")
  ) {
    return new OperationsError(
      "unauthorized",
      "You do not have permission to perform this action.",
    );
  }
  return new OperationsError(
    "invalid_record",
    message || "The operation could not be completed.",
  );
}

export function toSharedError(error: unknown): SharedFeatureError {
  const message = text(error);
  const lower = message.toLowerCase();
  if (lower.includes("mileage") || lower.includes("odometer")) {
    return new SharedFeatureError("invalid_mileage", message);
  }
  if (lower.includes("date"))
    return new SharedFeatureError("invalid_date", message);
  if (lower.includes("assignment"))
    return new SharedFeatureError("no_assignment", message);
  if (lower.includes("not found"))
    return new SharedFeatureError("not_found", message);
  if (
    lower.includes("permission") ||
    lower.includes("unauthorized") ||
    lower.includes("row-level security")
  ) {
    return new SharedFeatureError(
      "unauthorized",
      "You do not have permission to perform this action.",
    );
  }
  return new SharedFeatureError(
    "invalid_profile",
    message || "The request could not be completed.",
  );
}
