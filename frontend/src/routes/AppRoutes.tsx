import { lazy } from "react";
import { Route, Routes } from "react-router-dom";

import { AuthenticatedDashboardLayout } from "../layouts/AuthenticatedDashboardLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { PublicLayout } from "../layouts/PublicLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicOnlyRoute } from "./PublicOnlyRoute";
import { RoleRoute } from "./RoleRoute";

const ForgotPasswordPage = lazy(
  () => import("../pages/auth/ForgotPasswordPage"),
);
const SignInPage = lazy(() => import("../pages/auth/SignInPage"));
const SignUpPage = lazy(() => import("../pages/auth/SignUpPage"));
const AdminDashboardPage = lazy(
  () => import("../pages/admin/AdminDashboardPage"),
);
const UsersPage = lazy(() => import("../pages/admin/UsersPage"));
const AuditLogPage = lazy(() => import("../pages/admin/AuditLogPage"));
const DriverDashboardPage = lazy(
  () => import("../pages/driver/DriverDashboardPage"),
);
const DriverMaintenancePage = lazy(
  () => import("../pages/driver/DriverMaintenancePage"),
);
const DriverMileagePage = lazy(
  () => import("../pages/driver/DriverMileagePage"),
);
const LandingPage = lazy(() => import("../pages/shared/LandingPage"));
const ManagerDashboardPage = lazy(
  () => import("../pages/manager/ManagerDashboardPage"),
);
const MechanicDashboardPage = lazy(
  () => import("../pages/mechanic/MechanicDashboardPage"),
);
const DriversPage = lazy(() => import("../pages/shared/DriversPage"));
const MechanicsPage = lazy(() => import("../pages/shared/MechanicsPage"));
const VehiclesPage = lazy(() => import("../pages/shared/VehiclesPage"));
const AssignmentsPage = lazy(() => import("../pages/shared/AssignmentsPage"));
const MaintenanceSchedulesPage = lazy(
  () => import("../pages/shared/MaintenanceSchedulesPage"),
);
const WorkOrdersPage = lazy(() => import("../pages/shared/WorkOrdersPage"));
const ServiceHistoryPage = lazy(
  () => import("../pages/shared/ServiceHistoryPage"),
);
const ServiceTypesPage = lazy(() => import("../pages/shared/ServiceTypesPage"));
const NotificationsPage = lazy(
  () => import("../pages/shared/NotificationsPage"),
);
const ProfilePage = lazy(() => import("../pages/shared/ProfilePage"));
const ReportsPage = lazy(() => import("../pages/shared/ReportsPage"));
const UnauthorizedPage = lazy(() => import("../pages/shared/UnauthorizedPage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route element={<PublicLayout />}>
          <Route index element={<LandingPage />} />
        </Route>
        <Route element={<AuthLayout />}>
          <Route path="sign-in" element={<SignInPage />} />
          <Route path="sign-up" element={<SignUpPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="unauthorized" element={<UnauthorizedPage />} />

        <Route element={<RoleRoute allowedRoles={["admin"]} />}>
          <Route element={<AuthenticatedDashboardLayout />}>
            <Route path="admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="admin/audit-log" element={<AuditLogPage />} />
            <Route path="management/users" element={<UsersPage />} />
          </Route>
        </Route>
        <Route element={<RoleRoute allowedRoles={["admin", "manager"]} />}>
          <Route element={<AuthenticatedDashboardLayout />}>
            <Route path="management/drivers" element={<DriversPage />} />
            <Route path="management/mechanics" element={<MechanicsPage />} />
            <Route path="management/vehicles" element={<VehiclesPage />} />
            <Route
              path="operations/assignments"
              element={<AssignmentsPage />}
            />
            <Route
              path="maintenance/schedules"
              element={<MaintenanceSchedulesPage />}
            />
            <Route
              path="maintenance/service-types"
              element={<ServiceTypesPage />}
            />
            <Route path="reports" element={<ReportsPage />} />
          </Route>
        </Route>
        <Route
          element={
            <RoleRoute allowedRoles={["admin", "manager", "mechanic"]} />
          }
        >
          <Route element={<AuthenticatedDashboardLayout />}>
            <Route
              path="maintenance/work-orders"
              element={<WorkOrdersPage />}
            />
          </Route>
        </Route>
        <Route
          element={
            <RoleRoute
              allowedRoles={["admin", "manager", "mechanic", "driver"]}
            />
          }
        >
          <Route element={<AuthenticatedDashboardLayout />}>
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route
              path="maintenance/history"
              element={<ServiceHistoryPage />}
            />
          </Route>
        </Route>
        <Route element={<RoleRoute allowedRoles={["manager"]} />}>
          <Route element={<AuthenticatedDashboardLayout />}>
            <Route
              path="manager/dashboard"
              element={<ManagerDashboardPage />}
            />
          </Route>
        </Route>
        <Route element={<RoleRoute allowedRoles={["mechanic"]} />}>
          <Route element={<AuthenticatedDashboardLayout />}>
            <Route
              path="mechanic/dashboard"
              element={<MechanicDashboardPage />}
            />
          </Route>
        </Route>
        <Route element={<RoleRoute allowedRoles={["driver"]} />}>
          <Route element={<AuthenticatedDashboardLayout />}>
            <Route path="driver/dashboard" element={<DriverDashboardPage />} />
            <Route
              path="driver/maintenance"
              element={<DriverMaintenancePage />}
            />
            <Route path="driver/mileage" element={<DriverMileagePage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
