import type { UserRole } from "../types/auth";

export const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  admin: "/admin/dashboard",
  manager: "/manager/dashboard",
  mechanic: "/mechanic/dashboard",
  driver: "/driver/dashboard",
};

export function getRoleDashboardPath(role: UserRole) {
  return ROLE_DASHBOARD_PATHS[role];
}

export function formatRole(role: UserRole) {
  return `${role.charAt(0).toUpperCase()}${role.slice(1)}`;
}
