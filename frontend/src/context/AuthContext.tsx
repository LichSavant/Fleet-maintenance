import { useCallback, useMemo, useState, type ReactNode } from "react";

import { authService } from "../services/authService";
import { fleetDataService } from "../services/fleetDataService";
import {
  AuthError,
  type AuthSession,
  type RegistrationInput,
  type SignInCredentials,
} from "../types/auth";
import type { ProfileUpdateInput } from "../types/shared";
import { AuthContext, type AuthContextValue } from "./authContextValue";

export interface AuthProviderProps {
  children: ReactNode;
}

function restoreSession() {
  const storedSession = authService.getSession();
  if (!storedSession) return null;
  const fleetUser = fleetDataService
    .getSnapshot()
    .users.find((user) => user.id === storedSession.user.id);
  if (!fleetUser || fleetUser.status !== "Active") {
    authService.signOut();
    return null;
  }
  return storedSession;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(() =>
    restoreSession(),
  );
  const [rememberedEmail, setRememberedEmail] = useState(() =>
    authService.getRememberedEmail(),
  );

  const signIn = useCallback(async (credentials: SignInCredentials) => {
    let nextSession = await authService.signIn(credentials);
    const fleetUser = fleetDataService
      .getSnapshot()
      .users.find((user) => user.id === nextSession.user.id);
    if (!fleetUser || fleetUser.status !== "Active") {
      authService.signOut();
      throw new AuthError(
        "inactive_account",
        "This demonstration account is inactive or is not linked to fleet records.",
      );
    }
    nextSession = authService.updateSessionUser({
      email: fleetUser.email,
      fullName: fleetUser.fullName,
    });
    setSession(nextSession);
    setRememberedEmail(credentials.rememberEmail ? nextSession.user.email : "");
    return nextSession;
  }, []);

  const signOut = useCallback(() => {
    authService.signOut();
    setSession(null);
  }, []);

  const signUp = useCallback(async (input: RegistrationInput) => {
    const user = await authService.register(input);
    try {
      await fleetDataService.registerSelfServiceAccount(user, {
        licenseNumber: input.licenseNumber,
        specialty: input.specialty,
      });
      return user;
    } catch (error) {
      authService.removeRegistration(user.id);
      throw error;
    }
  }, []);

  const updateProfile = useCallback(
    async (input: ProfileUpdateInput) => {
      if (!session) {
        throw new Error("A signed-in session is required to update a profile.");
      }
      const user = await fleetDataService.updateOwnProfile(
        session.user.id,
        input,
      );
      const nextSession = authService.updateSessionUser(input);
      setSession(nextSession);
      return {
        email: user.email,
        fullName: user.fullName,
        id: user.id,
        role: user.role,
      };
    },
    [session],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading: false,
      rememberedEmail,
      requestPasswordReset: authService.requestPasswordReset,
      session,
      signIn,
      signOut,
      signUp,
      updateProfile,
      user: session?.user ?? null,
    }),
    [rememberedEmail, session, signIn, signOut, signUp, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
