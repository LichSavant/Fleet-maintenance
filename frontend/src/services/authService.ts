import type { User as SupabaseUser } from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";
import { toAuthError } from "../lib/supabaseErrors";
import {
  AuthError,
  type AuthSession,
  type AuthUser,
  type RegistrationInput,
  type SignInCredentials,
  type UserRole,
} from "../types/auth";
import type { ProfileUpdateInput } from "../types/shared";

const REMEMBERED_EMAIL_KEY = "forgefleet.auth.remembered-email";

export const REGISTRATION_POLICY = {
  restrictedRoles: ["admin", "manager"] as const,
  selfServiceRoles: ["mechanic", "driver"] as const,
};

interface ProfileRow {
  email: string;
  full_name: string;
  id: string;
  role: UserRole;
  status: "active" | "inactive";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function saveRememberedEmail(email: string | null) {
  try {
    if (email) window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    else window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  } catch {
    // Remembering an email is optional and never blocks authentication.
  }
}

async function fetchProfile(userId: string): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,status")
    .eq("id", userId)
    .single();

  if (error || !data) {
    throw new AuthError(
      "inactive_account",
      error?.message ??
        "This account is not linked to an active ForgeFleet profile.",
    );
  }
  return data as ProfileRow;
}

function toAuthUser(profile: ProfileRow): AuthUser {
  return {
    email: profile.email,
    fullName: profile.full_name,
    id: profile.id,
    role: profile.role,
  };
}

function toAppSession(profile: ProfileRow, createdAt?: string): AuthSession {
  return {
    createdAt: createdAt ?? new Date().toISOString(),
    user: toAuthUser(profile),
    version: 1,
  };
}

async function hydrateSupabaseUser(user: SupabaseUser): Promise<AuthSession> {
  const profile = await fetchProfile(user.id);
  if (profile.status !== "active") {
    await supabase.auth.signOut();
    throw new AuthError(
      "inactive_account",
      "This ForgeFleet account is inactive.",
    );
  }
  return toAppSession(profile, user.created_at);
}

export const authService = {
  async getSession(): Promise<AuthSession | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw toAuthError(error);
    if (!data.session?.user) return null;
    return hydrateSupabaseUser(data.session.user);
  },

  getRememberedEmail() {
    try {
      return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "";
    } catch {
      return "";
    }
  },

  async signIn(credentials: SignInCredentials): Promise<AuthSession> {
    const email = normalizeEmail(credentials.email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: credentials.password,
    });
    if (error || !data.user) throw toAuthError(error);

    try {
      const session = await hydrateSupabaseUser(data.user);
      saveRememberedEmail(credentials.rememberEmail ? email : null);
      return session;
    } catch (profileError) {
      await supabase.auth.signOut();
      throw profileError;
    }
  },

  async register(input: RegistrationInput): Promise<AuthUser> {
    if (input.role !== "driver" && input.role !== "mechanic") {
      throw new AuthError(
        "registration_restricted",
        "Administrator and Manager accounts must be invited by an administrator.",
      );
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(input.email),
      password: input.password,
      options: {
        data: {
          full_name: input.fullName.trim(),
          license_number:
            input.role === "driver" ? input.licenseNumber?.trim() : undefined,
          role: input.role,
          specialty:
            input.role === "mechanic" ? input.specialty?.trim() : undefined,
        },
      },
    });
    if (error || !data.user) throw toAuthError(error);

    return {
      email: normalizeEmail(input.email),
      fullName: input.fullName.trim(),
      id: data.user.id,
      role: input.role,
    };
  },

  async requestPasswordReset(email: string) {
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(
      normalizeEmail(email),
      { redirectTo },
    );
    if (error) throw toAuthError(error);
  },

  async updateCurrentUser(input: ProfileUpdateInput): Promise<AuthSession> {
    const fullName = input.fullName.trim();
    const email = normalizeEmail(input.email);
    const { data, error } = await supabase.auth.updateUser({
      email,
      data: { full_name: fullName },
    });
    if (error || !data.user) throw toAuthError(error);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", data.user.id);
    if (profileError) throw toAuthError(profileError);
    return hydrateSupabaseUser(data.user);
  },

  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw toAuthError(error);
  },

  onAuthStateChange(callback: (session: AuthSession | null) => void) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        callback(null);
        return;
      }
      void hydrateSupabaseUser(session.user)
        .then(callback)
        .catch(() => callback(null));
    });
    return () => data.subscription.unsubscribe();
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw toAuthError(error);
  },
};
