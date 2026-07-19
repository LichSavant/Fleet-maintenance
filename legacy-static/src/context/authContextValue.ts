import { createContext } from "react";

import type {
  AuthSession,
  AuthUser,
  RegistrationInput,
  SignInCredentials,
} from "../types/auth";
import type { ProfileUpdateInput } from "../types/shared";

export interface AuthContextValue {
  isLoading: boolean;
  rememberedEmail: string;
  requestPasswordReset: (email: string) => Promise<void>;
  session: AuthSession | null;
  signIn: (credentials: SignInCredentials) => Promise<AuthSession>;
  signOut: () => void;
  signUp: (input: RegistrationInput) => Promise<AuthUser>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (input: ProfileUpdateInput) => Promise<AuthUser>;
  user: AuthUser | null;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
