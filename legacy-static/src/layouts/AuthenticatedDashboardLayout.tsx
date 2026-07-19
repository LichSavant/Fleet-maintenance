import { AuthenticatedHeaderActions } from "../components/layout/AuthenticatedHeaderActions";
import { useAuth } from "../hooks/useAuth";
import { useFleetData } from "../hooks/useFleetData";
import { getNavigationForRole } from "../routes/roleNavigation";
import { sharedViewService } from "../services/sharedViewService";
import { formatRole } from "../utils/roleRoutes";
import { DashboardLayout } from "./DashboardLayout";

export function AuthenticatedDashboardLayout() {
  const { user } = useAuth();
  const { data } = useFleetData();

  if (!user) return null;

  const notifications = data
    ? sharedViewService.getNotifications(data, user)
    : [];

  return (
    <DashboardLayout
      headerActions={
        <AuthenticatedHeaderActions notifications={notifications} />
      }
      headerTitle={`${formatRole(user.role)} workspace`}
      navigation={getNavigationForRole(user.role)}
    />
  );
}
