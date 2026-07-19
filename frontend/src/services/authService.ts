import { DEVELOPMENT_ACCOUNTS } from "../data/mockAccounts";
import {
  AuthError,
  USER_ROLES,
  type AuthSession,
  type AuthUser,
  type RegistrationInput,
  type SignInCredentials,
  type StoredAuthAccount,
  type UserRole,
} from "../types/auth";
import { isRequired, isValidEmail, isValidPassword } from "../utils/validation";
import type { ProfileUpdateInput } from "../types/shared";

const STORAGE_KEYS = {
  registeredAccounts: "forgefleet.frontend.auth.accounts.v1",
  rememberedEmail: "forgefleet.frontend.auth.remembered-email.v1",
  session: "forgefleet.frontend.auth.session.v1",
} as const;

const MOCK_DELAY_MS = 250;

export const REGISTRATION_POLICY = {
  restrictedRoles: ["admin", "manager"] as const,
  selfServiceRoles: ["mechanic", "driver"] as const,
};

function delay() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, MOCK_DELAY_MS);
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}

function isAuthUser(value: unknown): value is AuthUser {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.fullName === "string" &&
    typeof value.email === "string" &&
    isUserRole(value.role)
  );
}

function isAuthSession(value: unknown): value is AuthSession {
  return (
    isRecord(value) &&
    value.version === 1 &&
    typeof value.createdAt === "string" &&
    isAuthUser(value.user)
  );
}

function isStoredAccount(value: unknown): value is StoredAuthAccount {
  return (
    isAuthUser(value) &&
    "password" in value &&
    typeof value.password === "string"
  );
}

function removeStoredValue(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage may be unavailable. Reads still fail closed as signed out.
  }
}

function readRegisteredAccounts(): StoredAuthAccount[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.registeredAccounts);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isStoredAccount)) {
      removeStoredValue(STORAGE_KEYS.registeredAccounts);
      return [];
    }

    return parsed;
  } catch {
    removeStoredValue(STORAGE_KEYS.registeredAccounts);
    return [];
  }
}

function writeRegisteredAccounts(accounts: StoredAuthAccount[]) {
  try {
    window.localStorage.setItem(
      STORAGE_KEYS.registeredAccounts,
      JSON.stringify(accounts),
    );
  } catch {
    throw new AuthError(
      "storage_unavailable",
      "This browser could not store the demonstration account.",
    );
  }
}

function writeSession(session: AuthSession) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
  } catch {
    throw new AuthError(
      "storage_unavailable",
      "This browser could not persist the demonstration session.",
    );
  }
}

function toAuthUser(account: StoredAuthAccount): AuthUser {
  const { email, fullName, id, role } = account;
  return { email, fullName, id, role };
}

function allAccounts() {
  return [...DEVELOPMENT_ACCOUNTS, ...readRegisteredAccounts()];
}

function createAccountId() {
  if (typeof window.crypto?.randomUUID === "function") {
    return `registered-user-${window.crypto.randomUUID()}`;
  }

  return `registered-user-${Date.now().toString(36)}`;
}

export const authService = {
  getSession(): AuthSession | null {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.session);
      if (!raw) return null;

      const parsed: unknown = JSON.parse(raw);
      if (!isAuthSession(parsed)) {
        removeStoredValue(STORAGE_KEYS.session);
        return null;
      }

      return parsed;
    } catch {
      removeStoredValue(STORAGE_KEYS.session);
      return null;
    }
  },

  getRememberedEmail() {
    try {
      return window.localStorage.getItem(STORAGE_KEYS.rememberedEmail) ?? "";
    } catch {
      return "";
    }
  },

  updateSessionUser(input: ProfileUpdateInput): AuthSession {
    const session = this.getSession();
    if (!session) {
      throw new AuthError(
        "invalid_credentials",
        "A signed-in session is required to update the profile.",
      );
    }
    const nextSession: AuthSession = {
      ...session,
      user: {
        ...session.user,
        email: normalizeEmail(input.email),
        fullName: input.fullName.trim(),
      },
    };
    writeSession(nextSession);
    return nextSession;
  },

  async signIn(credentials: SignInCredentials): Promise<AuthSession> {
    await delay();
    const email = normalizeEmail(credentials.email);
    const account = allAccounts().find(
      (candidate) =>
        normalizeEmail(candidate.email) === email &&
        candidate.password === credentials.password,
    );

    if (!account) {
      throw new AuthError(
        "invalid_credentials",
        "Email or password is invalid for this frontend demonstration.",
      );
    }

    const session: AuthSession = {
      createdAt: new Date().toISOString(),
      user: toAuthUser(account),
      version: 1,
    };

    writeSession(session);

    try {
      if (credentials.rememberEmail) {
        window.localStorage.setItem(STORAGE_KEYS.rememberedEmail, email);
      } else {
        window.localStorage.removeItem(STORAGE_KEYS.rememberedEmail);
      }
    } catch {
      // Remembering the email is optional and must not invalidate a session.
    }

    return session;
  },

  async register(input: RegistrationInput): Promise<AuthUser> {
    await delay();

    if (
      !isRequired(input.fullName) ||
      !isValidEmail(input.email) ||
      !isValidPassword(input.password) ||
      input.password !== input.confirmPassword ||
      !isUserRole(input.role)
    ) {
      throw new AuthError(
        "invalid_registration",
        "The registration details did not pass validation.",
      );
    }

    if (
      REGISTRATION_POLICY.restrictedRoles.includes(
        input.role as (typeof REGISTRATION_POLICY.restrictedRoles)[number],
      )
    ) {
      throw new AuthError(
        "registration_restricted",
        "Administrator and Manager accounts require a future provisioned approval workflow and cannot be self-registered in this prototype.",
      );
    }

    const email = normalizeEmail(input.email);
    if (
      allAccounts().some((account) => normalizeEmail(account.email) === email)
    ) {
      throw new AuthError(
        "duplicate_email",
        "That email is already registered in this browser.",
      );
    }

    const account: StoredAuthAccount = {
      email,
      fullName: input.fullName.trim(),
      id: createAccountId(),
      password: input.password,
      role: input.role,
    };

    writeRegisteredAccounts([...readRegisteredAccounts(), account]);
    return toAuthUser(account);
  },

  async requestPasswordReset(email: string) {
    await delay();
    if (!isValidEmail(email)) {
      throw new AuthError(
        "invalid_registration",
        "Enter a valid email address.",
      );
    }
  },

  removeRegistration(userId: string) {
    const remainingAccounts = readRegisteredAccounts().filter(
      (account) => account.id !== userId,
    );
    writeRegisteredAccounts(remainingAccounts);
  },

  signOut() {
    removeStoredValue(STORAGE_KEYS.session);
  },
};

export const AUTH_STORAGE_KEYS = STORAGE_KEYS;
