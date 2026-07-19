import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { authService } from "../services/authService";
import type {
  AuthSession,
  RegistrationInput,
  SignInCredentials,
} from "../types/auth";
import type { ProfileUpdateInput } from "../types/shared";
import { AuthContext, type AuthContextValue } from "./authContextValue";

export interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rememberedEmail, setRememberedEmail] = useState(() =>
    authService.getRememberedEmail(),
  );

  useEffect(() => {
    let active = true;
    void authService
      .getSession()
      .then((nextSession) => {
        if (active) setSession(nextSession);
      })
      .catch(() => {
        if (active) setSession(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    const unsubscribe = authService.onAuthStateChange((nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setIsLoading(false);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (credentials: SignInCredentials) => {
    const nextSession = await authService.signIn(credentials);
    setSession(nextSession);
    setRememberedEmail(credentials.rememberEmail ? nextSession.user.email : "");
    return nextSession;
  }, []);

  const signOut = useCallback(() => {
    void authService.signOut().finally(() => setSession(null));
  }, []);

  const signUp = useCallback(
    async (input: RegistrationInput) => authService.register(input),
    [],
  );

  const updatePassword = useCallback(
    async (password: string) => authService.updatePassword(password),
    [],
  );

  const updateProfile = useCallback(async (input: ProfileUpdateInput) => {
    const nextSession = await authService.updateCurrentUser(input);
    setSession(nextSession);
    return nextSession.user;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      rememberedEmail,
      requestPasswordReset: authService.requestPasswordReset,
      session,
      signIn,
      signOut,
      signUp,
      updatePassword,
      updateProfile,
      user: session?.user ?? null,
    }),
    [
      isLoading,
      rememberedEmail,
      session,
      signIn,
      signOut,
      signUp,
      updatePassword,
      updateProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
