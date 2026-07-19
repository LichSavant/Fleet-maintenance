import type { UserRole } from "../types/auth";
import type { NavigationItem } from "../types/navigation";
import { getRoleDashboardPath } from "../utils/roleRoutes";

export const ROLE_NAVIGATION: Record<UserRole, readonly NavigationItem[]> = {
  admin: [
    {
      icon: "dashboard",
      label: "Administrator dashboard",
      to: getRoleDashboardPath("admin"),
    },
    { icon: "users", label: "Users", to: "/management/users" },
    { icon: "driver", label: "Drivers", to: "/management/drivers" },
    { icon: "wrench", label: "Mechanics", to: "/management/mechanics" },
    { icon: "truck", label: "Vehicles", to: "/management/vehicles" },
    { icon: "truck", label: "Assignments", to: "/operations/assignments" },
    { icon: "wrench", label: "Schedules", to: "/maintenance/schedules" },
    { icon: "wrench", label: "Work orders", to: "/maintenance/work-orders" },
    { icon: "layers", label: "Service history", to: "/maintenance/history" },
    {
      icon: "layers",
      label: "Service types",
      to: "/maintenance/service-types",
    },
    { icon: "dashboard", label: "Reports", to: "/reports" },
  ],
  manager: [
    {
      icon: "dashboard",
      label: "Manager dashboard",
      to: getRoleDashboardPath("manager"),
    },
    { icon: "driver", label: "Drivers", to: "/management/drivers" },
    { icon: "wrench", label: "Mechanics", to: "/management/mechanics" },
    { icon: "truck", label: "Vehicles", to: "/management/vehicles" },
    { icon: "truck", label: "Assignments", to: "/operations/assignments" },
    { icon: "wrench", label: "Schedules", to: "/maintenance/schedules" },
    { icon: "wrench", label: "Work orders", to: "/maintenance/work-orders" },
    { icon: "layers", label: "Service history", to: "/maintenance/history" },
    {
      icon: "layers",
      label: "Service types",
      to: "/maintenance/service-types",
    },
    { icon: "dashboard", label: "Reports", to: "/reports" },
  ],
  mechanic: [
    {
      icon: "dashboard",
      label: "Mechanic dashboard",
      to: getRoleDashboardPath("mechanic"),
    },
    { icon: "wrench", label: "My work orders", to: "/maintenance/work-orders" },
    { icon: "layers", label: "Service history", to: "/maintenance/history" },
  ],
  driver: [
    {
      icon: "dashboard",
      label: "Driver dashboard",
      to: getRoleDashboardPath("driver"),
    },
    { icon: "truck", label: "Mileage", to: "/driver/mileage" },
    { icon: "wrench", label: "Maintenance", to: "/driver/maintenance" },
    { icon: "layers", label: "Service history", to: "/maintenance/history" },
  ],
};

export function getNavigationForRole(role: UserRole) {
  return ROLE_NAVIGATION[role];
}
