import { supabase } from "../lib/supabase";
import {
  toManagementError,
  toOperationsError,
  toSharedError,
} from "../lib/supabaseErrors";
import type { AuthUser } from "../types/auth";
import type {
  AssignmentStatus,
  DriverProfile,
  FleetDataSource,
  FleetNotification,
  FleetUserRecord,
  MaintenanceRecord,
  MaintenanceSchedule,
  MileageSubmission,
  Priority,
  ScheduleStatus,
  ServiceType,
  SystemActivity,
  UserStatus,
  Vehicle,
  VehicleAssignment,
  VehicleStatus,
  WorkOrderStatus,
} from "../types/fleet";
import type {
  DriverAccountInput,
  MechanicAccountInput,
  UserAccountInput,
  UserAccountUpdateInput,
  VehicleInput,
} from "../types/management";
import type {
  AssignmentInput,
  MaintenanceScheduleInput,
  ServiceTypeInput,
  WorkOrderInput,
  WorkOrderTransitionInput,
} from "../types/operations";
import type {
  MileageSubmissionInput,
  ProfileUpdateInput,
} from "../types/shared";
import { authService } from "./authService";

export const FLEET_DATA_CHANGED_EVENT = "forgefleet:data-changed";

const EMPTY_DATA: FleetDataSource = {
  assignments: [],
  driverProfiles: [],
  maintenanceRecords: [],
  maintenanceSchedules: [],
  managerProfiles: [],
  mechanicProfiles: [],
  mileageSubmissions: [],
  notifications: [],
  serviceTypes: [],
  systemActivity: [],
  users: [],
  vehicles: [],
};

let snapshot: FleetDataSource = EMPTY_DATA;

function notifyChanged() {
  window.dispatchEvent(new CustomEvent(FLEET_DATA_CHANGED_EVENT));
}

function setSnapshot(data: FleetDataSource) {
  snapshot = data;
  notifyChanged();
  return data;
}

function titleStatus(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function dbVehicleStatus(value: VehicleStatus) {
  return value.toLowerCase().replaceAll(" ", "_");
}

function dbPriority(value: Priority) {
  return value.toLowerCase();
}

function toUserStatus(value: string): UserStatus {
  return value === "active" ? "Active" : "Inactive";
}

function toVehicleStatus(value: string): VehicleStatus {
  return titleStatus(value) as VehicleStatus;
}

function toAssignmentStatus(value: string): AssignmentStatus {
  return titleStatus(value) as AssignmentStatus;
}

function toScheduleStatus(value: string): ScheduleStatus {
  return titleStatus(value) as ScheduleStatus;
}

function toPriority(value: string): Priority {
  return titleStatus(value) as Priority;
}

function toNotificationType(value: string): FleetNotification["type"] {
  return titleStatus(value) as FleetNotification["type"];
}

function profileRow(row: Record<string, unknown>): FleetUserRecord {
  return {
    email: String(row.email ?? ""),
    fullName: String(row.full_name ?? ""),
    id: String(row.id),
    role: row.role as FleetUserRecord["role"],
    status: toUserStatus(String(row.status)),
  };
}

function driverRow(row: Record<string, unknown>): DriverProfile {
  return {
    id: String(row.id),
    licenseNumber: String(row.license_number ?? ""),
    status: titleStatus(String(row.status)) as DriverProfile["status"],
    userId: String(row.user_id),
  };
}

function managerRow(row: Record<string, unknown>) {
  return {
    depot: String(row.depot ?? "Unassigned depot"),
    id: String(row.id),
    userId: String(row.user_id),
  };
}

function mechanicRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    specialty: String(row.specialty ?? ""),
    status: toUserStatus(String(row.status)),
    userId: String(row.user_id),
  };
}

function vehicleRow(row: Record<string, unknown>): Vehicle {
  return {
    fleetNumber: String(row.fleet_number ?? ""),
    health: Number(row.health ?? 100),
    id: String(row.id),
    manufacturer: String(row.manufacturer ?? ""),
    mileage: Number(row.mileage ?? 0),
    model: String(row.model ?? ""),
    plate: String(row.plate ?? ""),
    status: toVehicleStatus(String(row.status)),
    type: String(row.vehicle_type ?? ""),
    year: Number(row.model_year ?? 0),
  };
}

function assignmentRow(row: Record<string, unknown>): VehicleAssignment {
  return {
    driverProfileId: String(row.driver_profile_id),
    endDate: row.end_date ? String(row.end_date) : null,
    id: String(row.id),
    startDate: String(row.start_date),
    status: toAssignmentStatus(String(row.status)),
    vehicleId: String(row.vehicle_id),
  };
}

function scheduleRow(row: Record<string, unknown>): MaintenanceSchedule {
  return {
    createdAt: String(row.created_at),
    createdByUserId: String(row.created_by),
    dueDate: String(row.due_date),
    id: String(row.id),
    mechanicProfileId: row.mechanic_profile_id
      ? String(row.mechanic_profile_id)
      : null,
    notes: String(row.notes ?? ""),
    serviceTypeId: String(row.service_type_id),
    status: toScheduleStatus(String(row.status)),
    vehicleId: String(row.vehicle_id),
    workOrderId: row.work_order_id ? String(row.work_order_id) : null,
  };
}

function workOrderRow(row: Record<string, unknown>): MaintenanceRecord {
  return {
    completedDate: row.completed_date ? String(row.completed_date) : null,
    createdAt: String(row.created_at),
    createdByUserId: String(row.created_by),
    id: String(row.id),
    mechanicProfileId: row.mechanic_profile_id
      ? String(row.mechanic_profile_id)
      : null,
    notes: String(row.notes ?? ""),
    priority: toPriority(String(row.priority)),
    scheduleId: row.schedule_id ? String(row.schedule_id) : null,
    scheduledDate: String(row.scheduled_date),
    serviceNotes: String(row.service_notes ?? ""),
    serviceTypeId: String(row.service_type_id),
    status: String(row.status) as WorkOrderStatus,
    vehicleId: String(row.vehicle_id),
  };
}

function mileageRow(row: Record<string, unknown>): MileageSubmission {
  return {
    driverProfileId: String(row.driver_profile_id),
    id: String(row.id),
    mileage: Number(row.mileage ?? 0),
    notes: String(row.notes ?? ""),
    submittedAt: String(row.submitted_at),
    vehicleId: String(row.vehicle_id),
  };
}

function notificationRow(row: Record<string, unknown>): FleetNotification {
  return {
    createdAt: String(row.created_at),
    destination: String(row.destination ?? "/"),
    id: String(row.id),
    message: String(row.message ?? ""),
    read: Boolean(row.is_read),
    role: row.role
      ? (String(row.role) as FleetNotification["role"])
      : undefined,
    title: String(row.title ?? ""),
    type: toNotificationType(String(row.type)),
    userId: row.user_id ? String(row.user_id) : undefined,
  };
}

function activityRow(row: Record<string, unknown>): SystemActivity {
  return {
    action: String(row.action ?? ""),
    entityLabel: String(row.entity_label ?? ""),
    id: String(row.id),
    occurredAt: String(row.occurred_at),
    userId: row.user_id ? String(row.user_id) : "system",
  };
}

function serviceTypeRow(row: Record<string, unknown>): ServiceType {
  return {
    active: Boolean(row.active),
    description: String(row.description ?? ""),
    id: String(row.id),
    name: String(row.name ?? ""),
  };
}

async function requireRows(
  table: string,
  query: PromiseLike<{
    data: unknown[] | null;
    error: { message: string } | null;
  }>,
) {
  const { data, error } = await query;
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []) as Array<Record<string, unknown>>;
}

async function refreshSnapshot() {
  const [
    profiles,
    managerProfiles,
    driverProfiles,
    mechanicProfiles,
    vehicles,
    serviceTypes,
    assignments,
    schedules,
    workOrders,
    mileage,
    notifications,
    activity,
  ] = await Promise.all([
    requireRows(
      "profiles",
      supabase.from("profiles").select("*").order("full_name"),
    ),
    requireRows(
      "manager_profiles",
      supabase.from("manager_profiles").select("*"),
    ),
    requireRows(
      "driver_profiles",
      supabase.from("driver_profiles").select("*"),
    ),
    requireRows(
      "mechanic_profiles",
      supabase.from("mechanic_profiles").select("*"),
    ),
    requireRows(
      "vehicles",
      supabase.from("vehicles").select("*").order("fleet_number"),
    ),
    requireRows(
      "service_types",
      supabase.from("service_types").select("*").order("name"),
    ),
    requireRows(
      "vehicle_assignments",
      supabase
        .from("vehicle_assignments")
        .select("*")
        .order("start_date", { ascending: false }),
    ),
    requireRows(
      "maintenance_schedules",
      supabase.from("maintenance_schedules").select("*").order("due_date"),
    ),
    requireRows(
      "work_orders",
      supabase
        .from("work_orders")
        .select("*")
        .order("created_at", { ascending: false }),
    ),
    requireRows(
      "mileage_submissions",
      supabase
        .from("mileage_submissions")
        .select("*")
        .order("submitted_at", { ascending: false }),
    ),
    requireRows(
      "notifications",
      supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false }),
    ),
    requireRows(
      "system_activity",
      supabase
        .from("system_activity")
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(200),
    ),
  ]);

  return setSnapshot({
    assignments: assignments.map(assignmentRow),
    driverProfiles: driverProfiles.map(driverRow),
    maintenanceRecords: workOrders.map(workOrderRow),
    maintenanceSchedules: schedules.map(scheduleRow),
    managerProfiles: managerProfiles.map(managerRow),
    mechanicProfiles: mechanicProfiles.map(mechanicRow),
    mileageSubmissions: mileage.map(mileageRow),
    notifications: notifications.map(notificationRow),
    serviceTypes: serviceTypes.map(serviceTypeRow),
    systemActivity: activity.map(activityRow),
    users: profiles.map(profileRow),
    vehicles: vehicles.map(vehicleRow),
  });
}

async function invokeAdminUsers(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body,
  });
  if (error) throw error;
  if (data && typeof data === "object" && "error" in data) {
    throw new Error(String((data as { error: unknown }).error));
  }
  return data as { profile?: Record<string, unknown> } | null;
}

async function mutate<T>(operation: () => Promise<T>): Promise<T> {
  const result = await operation();
  await refreshSnapshot();
  return result;
}

export const fleetDataService = {
  getSnapshot(): FleetDataSource {
    return snapshot;
  },

  async load(): Promise<FleetDataSource> {
    return refreshSnapshot();
  },

  async createUser(input: UserAccountInput) {
    try {
      const result = await invokeAdminUsers({ action: "create", ...input });
      await refreshSnapshot();
      if (result?.profile) return profileRow(result.profile);
      const found = snapshot.users.find(
        (user) => user.email.toLowerCase() === input.email.trim().toLowerCase(),
      );
      if (!found) throw new Error("The invited user profile was not returned.");
      return found;
    } catch (error) {
      throw toManagementError(error);
    }
  },

  async registerSelfServiceAccount(authUser: AuthUser) {
    await refreshSnapshot();
    const user = snapshot.users.find((item) => item.id === authUser.id);
    if (!user)
      throw toManagementError(
        new Error("The profile trigger did not create the account record."),
      );
    return user;
  },

  async updateUser(userId: string, input: UserAccountUpdateInput) {
    try {
      const result = await invokeAdminUsers({
        action: "update",
        userId,
        ...input,
      });
      await refreshSnapshot();
      if (result?.profile) return profileRow(result.profile);
      const user = snapshot.users.find((item) => item.id === userId);
      if (!user) throw new Error("User not found after update.");
      return user;
    } catch (error) {
      throw toManagementError(error);
    }
  },

  async createDriver(input: DriverAccountInput) {
    return this.createUser({ ...input, role: "driver" });
  },

  async createMechanic(input: MechanicAccountInput) {
    return this.createUser({ ...input, role: "mechanic" });
  },

  async deactivateUser(userId: string, actorUserId: string) {
    try {
      if (userId === actorUserId)
        throw new Error("You cannot deactivate your own account.");
      await invokeAdminUsers({ action: "deactivate", userId });
      await refreshSnapshot();
      const user = snapshot.users.find((item) => item.id === userId);
      if (!user) throw new Error("User not found after deactivation.");
      return user;
    } catch (error) {
      throw toManagementError(error);
    }
  },

  async deactivateDriver(profileId: string, actorUserId: string) {
    const profile = snapshot.driverProfiles.find(
      (item) => item.id === profileId,
    );
    if (!profile)
      throw toManagementError(new Error("Driver profile not found."));
    return this.deactivateUser(profile.userId, actorUserId);
  },

  async deactivateMechanic(profileId: string, actorUserId: string) {
    const profile = snapshot.mechanicProfiles.find(
      (item) => item.id === profileId,
    );
    if (!profile)
      throw toManagementError(new Error("Mechanic profile not found."));
    return this.deactivateUser(profile.userId, actorUserId);
  },

  async createVehicle(input: VehicleInput) {
    try {
      return await mutate(async () => {
        const { data, error } = await supabase
          .from("vehicles")
          .insert({
            fleet_number: input.fleetNumber.trim().toUpperCase(),
            health: 100,
            manufacturer: input.manufacturer.trim(),
            mileage: input.mileage,
            model: input.model.trim(),
            model_year: input.year,
            plate: input.plate.trim().toUpperCase(),
            status: dbVehicleStatus(input.status),
            vehicle_type: input.type.trim(),
          })
          .select()
          .single();
        if (error) throw error;
        return vehicleRow(data as Record<string, unknown>);
      });
    } catch (error) {
      throw toManagementError(error);
    }
  },

  async updateVehicle(vehicleId: string, input: VehicleInput) {
    try {
      return await mutate(async () => {
        const { data, error } = await supabase
          .from("vehicles")
          .update({
            fleet_number: input.fleetNumber.trim().toUpperCase(),
            manufacturer: input.manufacturer.trim(),
            mileage: input.mileage,
            model: input.model.trim(),
            model_year: input.year,
            plate: input.plate.trim().toUpperCase(),
            status: dbVehicleStatus(input.status),
            vehicle_type: input.type.trim(),
          })
          .eq("id", vehicleId)
          .select()
          .single();
        if (error) throw error;
        return vehicleRow(data as Record<string, unknown>);
      });
    } catch (error) {
      throw toManagementError(error);
    }
  },

  async deactivateVehicle(vehicleId: string) {
    const current = snapshot.vehicles.find(
      (vehicle) => vehicle.id === vehicleId,
    );
    if (!current) throw toManagementError(new Error("Vehicle not found."));
    return this.updateVehicle(vehicleId, {
      ...current,
      status: "Out of Service",
    });
  },

  async createAssignment(input: AssignmentInput, _actorUserId: string) {
    void _actorUserId;
    try {
      return await mutate(async () => {
        const { data, error } = await supabase
          .from("vehicle_assignments")
          .insert({
            driver_profile_id: input.driverProfileId,
            start_date: input.startDate,
            status: "active",
            vehicle_id: input.vehicleId,
          })
          .select()
          .single();
        if (error) throw error;
        return assignmentRow(data as Record<string, unknown>);
      });
    } catch (error) {
      throw toOperationsError(error);
    }
  },

  async endAssignment(
    assignmentId: string,
    endDate: string,
    _actorUserId: string,
  ) {
    void _actorUserId;
    try {
      return await mutate(async () => {
        const { data, error } = await supabase
          .from("vehicle_assignments")
          .update({ end_date: endDate, status: "ended" })
          .eq("id", assignmentId)
          .select()
          .single();
        if (error) throw error;
        return assignmentRow(data as Record<string, unknown>);
      });
    } catch (error) {
      throw toOperationsError(error);
    }
  },

  async createMaintenanceSchedule(
    input: MaintenanceScheduleInput,
    _actorUserId: string,
  ) {
    void _actorUserId;
    try {
      return await mutate(async () => {
        const { data, error } = await supabase
          .from("maintenance_schedules")
          .insert({
            due_date: input.dueDate,
            mechanic_profile_id: input.mechanicProfileId || null,
            notes: input.notes.trim(),
            service_type_id: input.serviceTypeId,
            vehicle_id: input.vehicleId,
          })
          .select()
          .single();
        if (error) throw error;
        return scheduleRow(data as Record<string, unknown>);
      });
    } catch (error) {
      throw toOperationsError(error);
    }
  },

  async cancelMaintenanceSchedule(scheduleId: string, _actorUserId: string) {
    void _actorUserId;
    try {
      return await mutate(async () => {
        const { data, error } = await supabase
          .from("maintenance_schedules")
          .update({ status: "cancelled" })
          .eq("id", scheduleId)
          .select()
          .single();
        if (error) throw error;
        return scheduleRow(data as Record<string, unknown>);
      });
    } catch (error) {
      throw toOperationsError(error);
    }
  },

  async createWorkOrder(input: WorkOrderInput, _actorUserId: string) {
    void _actorUserId;
    try {
      return await mutate(async () => {
        const { data, error } = await supabase
          .from("work_orders")
          .insert({
            mechanic_profile_id: input.mechanicProfileId || null,
            notes: input.notes.trim(),
            priority: dbPriority(input.priority),
            schedule_id: input.scheduleId || null,
            scheduled_date: input.scheduledDate,
            service_type_id: input.serviceTypeId,
            status: input.mechanicProfileId ? "assigned" : "scheduled",
            vehicle_id: input.vehicleId,
          })
          .select()
          .single();
        if (error) throw error;
        return workOrderRow(data as Record<string, unknown>);
      });
    } catch (error) {
      throw toOperationsError(error);
    }
  },

  async assignWorkOrder(
    workOrderId: string,
    mechanicProfileId: string,
    _actorUserId: string,
  ) {
    void _actorUserId;
    try {
      return await mutate(async () => {
        const { data, error } = await supabase
          .from("work_orders")
          .update({
            mechanic_profile_id: mechanicProfileId,
            status: "assigned",
          })
          .eq("id", workOrderId)
          .select()
          .single();
        if (error) throw error;
        return workOrderRow(data as Record<string, unknown>);
      });
    } catch (error) {
      throw toOperationsError(error);
    }
  },

  async transitionWorkOrder(
    workOrderId: string,
    input: WorkOrderTransitionInput,
  ) {
    try {
      return await mutate(async () => {
        const patch: Record<string, unknown> = { status: input.status };
        if (input.serviceNotes !== undefined)
          patch.service_notes = input.serviceNotes.trim();
        const { data, error } = await supabase
          .from("work_orders")
          .update(patch)
          .eq("id", workOrderId)
          .select()
          .single();
        if (error) throw error;
        return workOrderRow(data as Record<string, unknown>);
      });
    } catch (error) {
      throw toOperationsError(error);
    }
  },

  async updateWorkOrderServiceNotes(
    workOrderId: string,
    serviceNotes: string,
    _actorUserId: string,
  ) {
    void _actorUserId;
    try {
      return await mutate(async () => {
        const { data, error } = await supabase
          .from("work_orders")
          .update({ service_notes: serviceNotes.trim() })
          .eq("id", workOrderId)
          .select()
          .single();
        if (error) throw error;
        return workOrderRow(data as Record<string, unknown>);
      });
    } catch (error) {
      throw toOperationsError(error);
    }
  },

  async createServiceType(input: ServiceTypeInput, _actorUserId: string) {
    void _actorUserId;
    try {
      return await mutate(async () => {
        const { data, error } = await supabase
          .from("service_types")
          .insert({
            description: input.description.trim(),
            name: input.name.trim(),
          })
          .select()
          .single();
        if (error) throw error;
        return serviceTypeRow(data as Record<string, unknown>);
      });
    } catch (error) {
      throw toOperationsError(error);
    }
  },

  async updateServiceType(
    serviceTypeId: string,
    input: ServiceTypeInput,
    _actorUserId: string,
  ) {
    void _actorUserId;
    try {
      return await mutate(async () => {
        const { data, error } = await supabase
          .from("service_types")
          .update({
            description: input.description.trim(),
            name: input.name.trim(),
          })
          .eq("id", serviceTypeId)
          .select()
          .single();
        if (error) throw error;
        return serviceTypeRow(data as Record<string, unknown>);
      });
    } catch (error) {
      throw toOperationsError(error);
    }
  },

  async deactivateServiceType(serviceTypeId: string, _actorUserId: string) {
    void _actorUserId;
    try {
      return await mutate(async () => {
        const { data, error } = await supabase
          .from("service_types")
          .update({ active: false })
          .eq("id", serviceTypeId)
          .select()
          .single();
        if (error) throw error;
        return serviceTypeRow(data as Record<string, unknown>);
      });
    } catch (error) {
      throw toOperationsError(error);
    }
  },

  async submitMileage(input: MileageSubmissionInput, actorUserId: string) {
    try {
      const profile = snapshot.driverProfiles.find(
        (item) => item.userId === actorUserId,
      );
      const assignment = profile
        ? snapshot.assignments.find(
            (item) =>
              item.driverProfileId === profile.id && item.status === "Active",
          )
        : undefined;
      if (!profile || !assignment)
        throw new Error("No active vehicle assignment was found.");

      return await mutate(async () => {
        const { data, error } = await supabase
          .from("mileage_submissions")
          .insert({
            driver_profile_id: profile.id,
            mileage: input.mileage,
            notes: input.notes.trim(),
            submission_date: input.submissionDate,
            vehicle_id: assignment.vehicleId,
          })
          .select()
          .single();
        if (error) throw error;
        return mileageRow(data as Record<string, unknown>);
      });
    } catch (error) {
      throw toSharedError(error);
    }
  },

  async markNotificationRead(notificationId: string, _actorUserId: string) {
    void _actorUserId;
    try {
      return await mutate(async () => {
        const { data, error } = await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("id", notificationId)
          .select()
          .single();
        if (error) throw error;
        return notificationRow(data as Record<string, unknown>);
      });
    } catch (error) {
      throw toSharedError(error);
    }
  },

  async markAllNotificationsRead(actorUserId: string) {
    try {
      const visible = snapshot.notifications.filter(
        (item) => item.userId === actorUserId || !item.userId,
      );
      const unreadIds = visible
        .filter((item) => !item.read)
        .map((item) => item.id);
      if (unreadIds.length === 0) return 0;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", unreadIds);
      if (error) throw error;
      await refreshSnapshot();
      return unreadIds.length;
    } catch (error) {
      throw toSharedError(error);
    }
  },

  async updateOwnProfile(_actorUserId: string, input: ProfileUpdateInput) {
    try {
      const session = await authService.updateCurrentUser(input);
      await refreshSnapshot();
      const user = snapshot.users.find((item) => item.id === session.user.id);
      if (!user) throw new Error("Updated profile could not be loaded.");
      return user;
    } catch (error) {
      throw toSharedError(error);
    }
  },
};
