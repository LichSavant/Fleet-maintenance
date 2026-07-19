export const USER_ROLES = ["admin", "manager", "mechanic", "driver"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface AuthUser {
  email: string;
  fullName: string;
  id: string;
  role: UserRole;
}

export interface AuthSession {
  createdAt: string;
  user: AuthUser;
  version: 1;
}

export interface SignInCredentials {
  email: string;
  password: string;
  rememberEmail?: boolean;
}

export interface RegistrationInput {
  confirmPassword: string;
  email: string;
  fullName: string;
  licenseNumber?: string;
  password: string;
  role: UserRole;
  specialty?: string;
}

export interface StoredAuthAccount extends AuthUser {
  password: string;
}

export type AuthErrorCode =
  | "duplicate_email"
  | "inactive_account"
  | "invalid_credentials"
  | "invalid_registration"
  | "registration_restricted"
  | "storage_unavailable";

export class AuthError extends Error {
  public readonly code: AuthErrorCode;

  public constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}
