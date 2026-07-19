import type { StoredAuthAccount } from "../types/auth";

/**
 * Development-only accounts for the frontend authentication simulation.
 * These browser-visible passwords are not secrets and provide no security.
 */
export const DEVELOPMENT_ACCOUNTS: readonly StoredAuthAccount[] = [
  {
    email: "admin@forgefleet.demo",
    fullName: "Felix Dela Cruz",
    id: "demo-user-admin",
    password: "admin123",
    role: "admin",
  },
  {
    email: "manager@forgefleet.demo",
    fullName: "Maria Santos",
    id: "demo-user-manager",
    password: "manager123",
    role: "manager",
  },
  {
    email: "mechanic@forgefleet.demo",
    fullName: "Noel Ramos",
    id: "demo-user-mechanic",
    password: "mechanic123",
    role: "mechanic",
  },
  {
    email: "driver@forgefleet.demo",
    fullName: "Carlo Reyes",
    id: "demo-user-driver",
    password: "driver123",
    role: "driver",
  },
];
