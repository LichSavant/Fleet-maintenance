export type SharedFeatureErrorCode =
  | "duplicate_email"
  | "invalid_date"
  | "invalid_mileage"
  | "invalid_profile"
  | "no_assignment"
  | "not_found"
  | "unauthorized";

export class SharedFeatureError extends Error {
  public readonly code: SharedFeatureErrorCode;

  public constructor(code: SharedFeatureErrorCode, message: string) {
    super(message);
    this.name = "SharedFeatureError";
    this.code = code;
  }
}

export interface MileageSubmissionInput {
  mileage: number;
  notes: string;
  submissionDate: string;
}

export interface ProfileUpdateInput {
  email: string;
  fullName: string;
}
