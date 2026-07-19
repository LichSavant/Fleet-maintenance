import type {
  AuditEntityType,
  AuditEvent,
  DriverProfile,
  FleetState,
  MaintenanceHistoryRecord,
  MaintenanceSchedule,
  MaintenanceWorkOrder,
  MechanicProfile,
  MileageLog,
  Notification,
  ServiceType,
  User,
  Vehicle,
  VehicleAssignment,
} from "../types/fleet";

export const FLEET_STATE_VERSION = 3 as const;

export interface StoredFleetState {
  data: FleetState;
  version: typeof FLEET_STATE_VERSION;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || isString(value);
}

function hasUniqueIds(records: readonly { id: string }[]) {
  return new Set(records.map(({ id }) => id)).size === records.length;
}

function hasBaseFields(
  value: unknown,
): value is UnknownRecord & { id: string } {
  return isRecord(value) && isString(value.id) && value.id.length > 0;
}

function isUser(value: unknown): value is User {
  return (
    hasBaseFields(value) &&
    isString(value.fullName) &&
    isString(value.email) &&
    ["admin", "manager", "mechanic", "driver"].includes(String(value.role)) &&
    ["Active", "Inactive"].includes(String(value.status))
  );
}

function isDriverProfile(value: unknown): value is DriverProfile {
  return (
    hasBaseFields(value) &&
    isString(value.userId) &&
    isString(value.employeeNumber) &&
    isString(value.licenseNumber) &&
    isString(value.phone) &&
    ["Assigned", "Available", "Inactive"].includes(String(value.status))
  );
}

function isMechanicProfile(value: unknown): value is MechanicProfile {
  return (
    hasBaseFields(value) &&
    isString(value.userId) &&
    isString(value.employeeNumber) &&
    isString(value.specialization) &&
    isString(value.phone) &&
    ["Active", "Inactive"].includes(String(value.status))
  );
}

function isVehicle(value: unknown): value is Vehicle {
  return (
    hasBaseFields(value) &&
    isString(value.plateNumber) &&
    isString(value.vin) &&
    isString(value.make) &&
    isString(value.model) &&
    isFiniteNumber(value.year) &&
    isFiniteNumber(value.currentMileage) &&
    isString(value.fleetNumber) &&
    isString(value.type) &&
    ["Active", "Maintenance", "Inspection", "Out of Service"].includes(
      String(value.status),
    )
  );
}

function isAssignment(value: unknown): value is VehicleAssignment {
  return (
    hasBaseFields(value) &&
    isString(value.driverId) &&
    isString(value.vehicleId) &&
    isString(value.startDate) &&
    isStringOrNull(value.endDate) &&
    ["Active", "Ended"].includes(String(value.status))
  );
}

function isMileageLog(value: unknown): value is MileageLog {
  return (
    hasBaseFields(value) &&
    isString(value.vehicleId) &&
    isString(value.driverId) &&
    isFiniteNumber(value.odometerReading) &&
    isString(value.logDate) &&
    isString(value.notes)
  );
}

function isServiceType(value: unknown): value is ServiceType {
  return (
    hasBaseFields(value) &&
    isString(value.name) &&
    isString(value.description) &&
    isFiniteNumber(value.recommendedIntervalKm) &&
    value.recommendedIntervalKm > 0 &&
    ["Active", "Inactive"].includes(String(value.status))
  );
}

function isWorkOrder(value: unknown): value is MaintenanceWorkOrder {
  return (
    hasBaseFields(value) &&
    isString(value.vehicleId) &&
    isString(value.serviceTypeId) &&
    isStringOrNull(value.assignedMechanicId) &&
    isString(value.requestedByUserId) &&
    ["scheduled", "assigned", "in_progress", "completed", "cancelled"].includes(
      String(value.status),
    ) &&
    isString(value.scheduledDate) &&
    isString(value.notes) &&
    ["Low", "Medium", "High"].includes(String(value.priority)) &&
    isStringOrNull(value.scheduleId) &&
    isString(value.serviceNotes) &&
    isString(value.createdAt)
  );
}

function isHistory(value: unknown): value is MaintenanceHistoryRecord {
  return (
    hasBaseFields(value) &&
    isString(value.vehicleId) &&
    isString(value.serviceTypeId) &&
    isString(value.mechanicId) &&
    isString(value.workOrderId) &&
    isString(value.serviceDate) &&
    isFiniteNumber(value.odometerAtService) &&
    isFiniteNumber(value.totalCost) &&
    isString(value.notes)
  );
}

function isSchedule(value: unknown): value is MaintenanceSchedule {
  return (
    hasBaseFields(value) &&
    isString(value.vehicleId) &&
    isString(value.serviceTypeId) &&
    isStringOrNull(value.assignedMechanicId) &&
    isString(value.requestedByUserId) &&
    isString(value.dueDate) &&
    ["Overdue", "Upcoming", "Converted", "Cancelled"].includes(
      String(value.status),
    ) &&
    isString(value.notes) &&
    isString(value.createdAt) &&
    isStringOrNull(value.workOrderId)
  );
}

function isNotification(value: unknown): value is Notification {
  return (
    hasBaseFields(value) &&
    isString(value.userId) &&
    [
      "Assignment",
      "Maintenance",
      "Mileage",
      "Reminder",
      "Schedule",
      "System",
    ].includes(String(value.type)) &&
    isString(value.title) &&
    isString(value.message) &&
    isString(value.createdAt) &&
    isStringOrNull(value.readAt) &&
    isString(value.relatedRoute)
  );
}

function isAuditEvent(value: unknown): value is AuditEvent {
  return (
    hasBaseFields(value) &&
    isString(value.userId) &&
    ["admin", "manager", "mechanic", "driver"].includes(String(value.role)) &&
    isString(value.action) &&
    isString(value.entityType) &&
    isString(value.entityId) &&
    isString(value.description) &&
    isString(value.createdAt)
  );
}

export function isValidFleetState(value: unknown): value is FleetState {
  if (!isRecord(value)) return false;

  const collections = [
    value.users,
    value.driverProfiles,
    value.mechanicProfiles,
    value.managerProfiles,
    value.vehicles,
    value.assignments,
    value.mileageLogs,
    value.serviceTypes,
    value.maintenanceWorkOrders,
    value.maintenanceHistory,
    value.maintenanceSchedules,
    value.notifications,
    value.auditEvents,
  ];
  if (!collections.every(Array.isArray)) return false;

  const users = value.users as unknown[];
  const driverProfiles = value.driverProfiles as unknown[];
  const mechanicProfiles = value.mechanicProfiles as unknown[];
  const managerProfiles = value.managerProfiles as unknown[];
  const vehicles = value.vehicles as unknown[];
  const assignments = value.assignments as unknown[];
  const mileageLogs = value.mileageLogs as unknown[];
  const serviceTypes = value.serviceTypes as unknown[];
  const workOrders = value.maintenanceWorkOrders as unknown[];
  const history = value.maintenanceHistory as unknown[];
  const schedules = value.maintenanceSchedules as unknown[];
  const notifications = value.notifications as unknown[];
  const auditEvents = value.auditEvents as unknown[];

  if (
    !users.every(isUser) ||
    !driverProfiles.every(isDriverProfile) ||
    !mechanicProfiles.every(isMechanicProfile) ||
    !managerProfiles.every(
      (item) =>
        hasBaseFields(item) && isString(item.userId) && isString(item.depot),
    ) ||
    !vehicles.every(isVehicle) ||
    !assignments.every(isAssignment) ||
    !mileageLogs.every(isMileageLog) ||
    !serviceTypes.every(isServiceType) ||
    !workOrders.every(isWorkOrder) ||
    !history.every(isHistory) ||
    !schedules.every(isSchedule) ||
    !notifications.every(isNotification) ||
    !auditEvents.every(isAuditEvent)
  ) {
    return false;
  }

  const typedCollections = collections as Array<Array<{ id: string }>>;
  if (!typedCollections.every(hasUniqueIds)) return false;

  const userIds = new Set(users.map((item) => (item as User).id));
  const driverIds = new Set(
    driverProfiles.map((item) => (item as DriverProfile).id),
  );
  const mechanicIds = new Set(
    mechanicProfiles.map((item) => (item as MechanicProfile).id),
  );
  const vehicleIds = new Set(vehicles.map((item) => (item as Vehicle).id));
  const serviceTypeIds = new Set(
    serviceTypes.map((item) => (item as ServiceType).id),
  );
  const workOrderIds = new Set(
    workOrders.map((item) => (item as MaintenanceWorkOrder).id),
  );
  const scheduleIds = new Set(
    schedules.map((item) => (item as MaintenanceSchedule).id),
  );

  return (
    driverProfiles.every((item) =>
      userIds.has((item as DriverProfile).userId),
    ) &&
    mechanicProfiles.every((item) =>
      userIds.has((item as MechanicProfile).userId),
    ) &&
    managerProfiles.every((item) =>
      userIds.has((item as { userId: string }).userId),
    ) &&
    assignments.every((item) => {
      const assignment = item as VehicleAssignment;
      return (
        driverIds.has(assignment.driverId) &&
        vehicleIds.has(assignment.vehicleId)
      );
    }) &&
    mileageLogs.every((item) => {
      const log = item as MileageLog;
      return driverIds.has(log.driverId) && vehicleIds.has(log.vehicleId);
    }) &&
    workOrders.every((item) => {
      const workOrder = item as MaintenanceWorkOrder;
      return (
        vehicleIds.has(workOrder.vehicleId) &&
        serviceTypeIds.has(workOrder.serviceTypeId) &&
        userIds.has(workOrder.requestedByUserId) &&
        (!workOrder.assignedMechanicId ||
          mechanicIds.has(workOrder.assignedMechanicId)) &&
        (!workOrder.scheduleId || scheduleIds.has(workOrder.scheduleId))
      );
    }) &&
    history.every((item) => {
      const record = item as MaintenanceHistoryRecord;
      return (
        vehicleIds.has(record.vehicleId) &&
        serviceTypeIds.has(record.serviceTypeId) &&
        mechanicIds.has(record.mechanicId) &&
        workOrderIds.has(record.workOrderId)
      );
    }) &&
    schedules.every((item) => {
      const schedule = item as MaintenanceSchedule;
      return (
        vehicleIds.has(schedule.vehicleId) &&
        serviceTypeIds.has(schedule.serviceTypeId) &&
        userIds.has(schedule.requestedByUserId) &&
        (!schedule.assignedMechanicId ||
          mechanicIds.has(schedule.assignedMechanicId)) &&
        (!schedule.workOrderId || workOrderIds.has(schedule.workOrderId))
      );
    }) &&
    notifications.every((item) => userIds.has((item as Notification).userId)) &&
    auditEvents.every((item) => userIds.has((item as AuditEvent).userId))
  );
}

function legacyEmployeeNumber(prefix: "DRV" | "MEC", index: number) {
  return `${prefix}-${String(index + 1).padStart(4, "0")}`;
}

function legacyEntityType(action: string): AuditEntityType {
  const normalized = action.toLowerCase();
  if (normalized.includes("assignment")) return "assignment";
  if (normalized.includes("schedule")) return "maintenance_schedule";
  if (normalized.includes("maintenance") || normalized.includes("work order")) {
    return "maintenance_work_order";
  }
  if (normalized.includes("mileage")) return "mileage_log";
  if (normalized.includes("profile")) return "profile";
  if (normalized.includes("vehicle")) return "vehicle";
  return "user";
}

function migrateLegacyFleetData(value: unknown): FleetState | null {
  if (!isRecord(value)) return null;
  const requiredArrays = [
    "users",
    "driverProfiles",
    "mechanicProfiles",
    "managerProfiles",
    "vehicles",
    "assignments",
    "maintenanceRecords",
    "maintenanceSchedules",
    "mileageSubmissions",
    "notifications",
    "serviceTypes",
    "systemActivity",
  ];
  if (!requiredArrays.every((key) => Array.isArray(value[key]))) return null;

  try {
    const users = (value.users as UnknownRecord[]).map((user) => ({
      email: String(user.email ?? ""),
      fullName: String(user.fullName ?? ""),
      id: String(user.id ?? ""),
      role: user.role as User["role"],
      status: user.status as User["status"],
    }));
    const userById = new Map(users.map((user) => [user.id, user]));
    const driverProfiles = (value.driverProfiles as UnknownRecord[]).map(
      (profile, index) => ({
        employeeNumber: legacyEmployeeNumber("DRV", index),
        id: String(profile.id ?? ""),
        licenseNumber: String(profile.licenseNumber ?? ""),
        phone: "",
        status: profile.status as DriverProfile["status"],
        userId: String(profile.userId ?? ""),
      }),
    );
    const mechanicProfiles = (value.mechanicProfiles as UnknownRecord[]).map(
      (profile, index) => ({
        employeeNumber: legacyEmployeeNumber("MEC", index),
        id: String(profile.id ?? ""),
        phone: "",
        specialization: String(profile.specialty ?? "General maintenance"),
        status: profile.status as MechanicProfile["status"],
        userId: String(profile.userId ?? ""),
      }),
    );
    const vehicles = (value.vehicles as UnknownRecord[]).map((vehicle) => ({
      currentMileage: Number(vehicle.mileage ?? 0),
      fleetNumber: String(vehicle.fleetNumber ?? ""),
      id: String(vehicle.id ?? ""),
      make: String(vehicle.manufacturer ?? ""),
      model: String(vehicle.model ?? ""),
      plateNumber: String(vehicle.plate ?? ""),
      status: vehicle.status as Vehicle["status"],
      type: String(vehicle.type ?? "Fleet vehicle"),
      vin: `LEGACY-${String(vehicle.id ?? "UNKNOWN").toUpperCase()}`,
      year: Number(vehicle.year ?? 0),
    }));
    const assignments = (value.assignments as UnknownRecord[]).map(
      (assignment) => ({
        driverId: String(assignment.driverProfileId ?? ""),
        endDate: (assignment.endDate ?? null) as string | null,
        id: String(assignment.id ?? ""),
        startDate: String(assignment.startDate ?? ""),
        status: assignment.status as VehicleAssignment["status"],
        vehicleId: String(assignment.vehicleId ?? ""),
      }),
    );
    const serviceTypes = (value.serviceTypes as UnknownRecord[]).map(
      (serviceType) => ({
        description: String(serviceType.description ?? ""),
        id: String(serviceType.id ?? ""),
        name: String(serviceType.name ?? ""),
        recommendedIntervalKm: 10000,
        status: serviceType.active === false ? "Inactive" : "Active",
      }),
    ) satisfies ServiceType[];
    const maintenanceWorkOrders = (
      value.maintenanceRecords as UnknownRecord[]
    ).map((record) => ({
      assignedMechanicId: (record.mechanicProfileId ?? null) as string | null,
      createdAt: String(record.createdAt ?? record.scheduledDate ?? ""),
      id: String(record.id ?? ""),
      notes: String(record.notes ?? ""),
      priority: record.priority as MaintenanceWorkOrder["priority"],
      requestedByUserId: String(record.createdByUserId ?? ""),
      scheduleId: (record.scheduleId ?? null) as string | null,
      scheduledDate: String(record.scheduledDate ?? ""),
      serviceNotes: String(record.serviceNotes ?? ""),
      serviceTypeId: String(record.serviceTypeId ?? ""),
      status: record.status as MaintenanceWorkOrder["status"],
      vehicleId: String(record.vehicleId ?? ""),
    }));
    const vehicleMileage = new Map(
      vehicles.map((vehicle) => [vehicle.id, vehicle.currentMileage]),
    );
    const maintenanceHistory = (value.maintenanceRecords as UnknownRecord[])
      .filter(
        (record) =>
          record.status === "completed" &&
          isString(record.completedDate) &&
          isString(record.mechanicProfileId),
      )
      .map((record) => ({
        id: `history-${String(record.id ?? "")}`,
        mechanicId: String(record.mechanicProfileId),
        notes: String(record.serviceNotes ?? record.notes ?? ""),
        odometerAtService:
          vehicleMileage.get(String(record.vehicleId ?? "")) ?? 0,
        serviceDate: String(record.completedDate),
        serviceTypeId: String(record.serviceTypeId ?? ""),
        totalCost: 0,
        vehicleId: String(record.vehicleId ?? ""),
        workOrderId: String(record.id ?? ""),
      }));
    const maintenanceSchedules = (
      value.maintenanceSchedules as UnknownRecord[]
    ).map((schedule) => ({
      assignedMechanicId: (schedule.mechanicProfileId ?? null) as string | null,
      createdAt: String(schedule.createdAt ?? ""),
      dueDate: String(schedule.dueDate ?? ""),
      id: String(schedule.id ?? ""),
      notes: String(schedule.notes ?? ""),
      requestedByUserId: String(schedule.createdByUserId ?? ""),
      serviceTypeId: String(schedule.serviceTypeId ?? ""),
      status: schedule.status as MaintenanceSchedule["status"],
      vehicleId: String(schedule.vehicleId ?? ""),
      workOrderId: (schedule.workOrderId ?? null) as string | null,
    }));
    const mileageLogs = (value.mileageSubmissions as UnknownRecord[]).map(
      (log) => ({
        driverId: String(log.driverProfileId ?? ""),
        id: String(log.id ?? ""),
        logDate: String(log.submittedAt ?? ""),
        notes: String(log.notes ?? ""),
        odometerReading: Number(log.mileage ?? 0),
        vehicleId: String(log.vehicleId ?? ""),
      }),
    );
    const notifications = (value.notifications as UnknownRecord[]).flatMap(
      (notification, index) => {
        const recipientIds = isString(notification.userId)
          ? [notification.userId]
          : users
              .filter((user) => user.role === notification.role)
              .map((user) => user.id);
        return recipientIds.map((userId, recipientIndex) => ({
          createdAt: String(notification.createdAt ?? ""),
          id:
            recipientIds.length === 1
              ? String(notification.id ?? `notification-${index}`)
              : `${String(notification.id ?? `notification-${index}`)}-${recipientIndex}`,
          message: String(notification.message ?? ""),
          readAt: notification.read
            ? String(notification.createdAt ?? new Date(0).toISOString())
            : null,
          relatedRoute: String(notification.destination ?? "/notifications"),
          title: String(notification.title ?? "Fleet update"),
          type: notification.type as Notification["type"],
          userId,
        }));
      },
    );
    const auditEvents = (value.systemActivity as UnknownRecord[]).map(
      (event, index) => {
        const userId = String(event.userId ?? "");
        const action = String(event.action ?? "Updated record");
        return {
          action,
          createdAt: String(event.occurredAt ?? ""),
          description: String(event.entityLabel ?? ""),
          entityId: `legacy-entity-${index}`,
          entityType: legacyEntityType(action),
          id: String(event.id ?? `audit-${index}`),
          role: userById.get(userId)?.role ?? "admin",
          userId,
        };
      },
    );

    const migrated: FleetState = {
      assignments,
      auditEvents,
      driverProfiles,
      maintenanceHistory,
      maintenanceSchedules,
      maintenanceWorkOrders,
      managerProfiles: (
        value.managerProfiles as FleetState["managerProfiles"]
      ).map((profile) => ({ ...profile })),
      mechanicProfiles,
      mileageLogs,
      notifications,
      serviceTypes,
      users,
      vehicles,
    };
    return isValidFleetState(migrated) ? migrated : null;
  } catch {
    return null;
  }
}

export function readStoredFleetState(value: unknown): FleetState | null {
  if (!isRecord(value) || !isFiniteNumber(value.version)) return null;
  if (value.version === FLEET_STATE_VERSION) {
    return isValidFleetState(value.data) ? value.data : null;
  }
  if (value.version === 2) return migrateLegacyFleetData(value.data);
  return null;
}

export function createStoredFleetState(data: FleetState): StoredFleetState {
  return { data, version: FLEET_STATE_VERSION };
}
