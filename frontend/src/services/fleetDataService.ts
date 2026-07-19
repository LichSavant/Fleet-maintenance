import { MOCK_FLEET_DATA } from "../data/mockFleetData";
import type { AuthUser } from "../types/auth";
import type {
  AuditEntityType,
  FleetState,
  MaintenanceSchedule,
  Notification,
  ServiceType,
  User,
  Vehicle,
  VehicleAssignment,
  WorkOrderStatus,
} from "../types/fleet";
import {
  ManagementError,
  type DriverAccountInput,
  type MechanicAccountInput,
  type UserAccountInput,
  type UserAccountUpdateInput,
  type VehicleInput,
} from "../types/management";
import {
  OperationsError,
  type AssignmentInput,
  type MaintenanceHistoryCorrectionInput,
  type MaintenanceScheduleInput,
  type ServiceTypeInput,
  type WorkOrderInput,
  type WorkOrderTransitionInput,
} from "../types/operations";
import {
  SharedFeatureError,
  type MileageSubmissionInput,
  type ProfileUpdateInput,
} from "../types/shared";
import { isRequired, isValidEmail } from "../utils/validation";
import {
  createStoredFleetState,
  FLEET_STATE_VERSION,
  readStoredFleetState,
} from "./fleetStateMigration";
import { mileageService } from "./mileageService";

const STORAGE_KEY = "forgefleet.frontend.fleet-data.v4";
const LEGACY_STORAGE_KEY = "forgefleet.frontend.fleet-data.v3";
const OLDER_STORAGE_KEY = "forgefleet.frontend.fleet-data.v2";
const DEMO_DELAY_MS = 120;
const DATA_CHANGED_EVENT = "forgefleet:data-changed";

type MutableFleetData = {
  -readonly [
    Key in keyof FleetState
  ]: FleetState[Key] extends readonly (infer Item)[] ? Item[] : never;
};

function delay() {
  return new Promise<void>((resolve) =>
    window.setTimeout(resolve, DEMO_DELAY_MS),
  );
}

function cloneData(data: FleetState): MutableFleetData {
  return JSON.parse(JSON.stringify(data)) as MutableFleetData;
}

function removeStoredValue(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Reads fail closed to the seeded state when storage is unavailable.
  }
}

function readData(): MutableFleetData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const current = readStoredFleetState(JSON.parse(raw) as unknown);
      if (current) return cloneData(current);
      removeStoredValue(STORAGE_KEY);
    }

    for (const legacyKey of [LEGACY_STORAGE_KEY, OLDER_STORAGE_KEY]) {
      const legacyRaw = window.localStorage.getItem(legacyKey);
      if (legacyRaw) {
        const migrated = readStoredFleetState(JSON.parse(legacyRaw) as unknown);
        if (migrated) {
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(createStoredFleetState(migrated)),
          );
          removeStoredValue(legacyKey);
          return cloneData(migrated);
        }
        removeStoredValue(legacyKey);
      }
    }
  } catch {
    removeStoredValue(STORAGE_KEY);
  }
  return cloneData(MOCK_FLEET_DATA);
}

function writeData(data: MutableFleetData) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(createStoredFleetState(data)),
    );
    window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT));
  } catch {
    throw new ManagementError(
      "storage_unavailable",
      "This browser could not save the demonstration fleet data.",
    );
  }
}

export const FLEET_STORAGE_KEYS = {
  current: STORAGE_KEY,
  legacy: LEGACY_STORAGE_KEY,
  legacyV2: OLDER_STORAGE_KEY,
  version: FLEET_STATE_VERSION,
} as const;

function createId(prefix: string) {
  const value = window.crypto?.randomUUID?.() ?? Date.now().toString(36);
  return `${prefix}-${value}`;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function validatePerson(fullName: string, email: string) {
  if (!isRequired(fullName) || !isValidEmail(email)) {
    throw new ManagementError(
      "invalid_record",
      "Enter a full name and valid email address.",
    );
  }
}

function ensureUniqueEmail(
  data: MutableFleetData,
  email: string,
  excludedUserId?: string,
) {
  if (
    data.users.some(
      (user) =>
        user.id !== excludedUserId &&
        normalize(user.email) === normalize(email),
    )
  ) {
    throw new ManagementError(
      "duplicate_email",
      "A user account with that email address already exists.",
    );
  }
}

function ensureUniqueLicense(
  data: MutableFleetData,
  licenseNumber: string,
  excludedProfileId?: string,
) {
  if (!isRequired(licenseNumber)) {
    throw new ManagementError("invalid_record", "Enter a license number.");
  }
  if (
    data.driverProfiles.some(
      (profile) =>
        profile.id !== excludedProfileId &&
        normalize(profile.licenseNumber) === normalize(licenseNumber),
    )
  ) {
    throw new ManagementError(
      "duplicate_license",
      "A driver profile with that license number already exists.",
    );
  }
}

function addRoleProfile(
  data: MutableFleetData,
  user: User,
  input: UserAccountInput,
) {
  if (user.role === "driver") {
    ensureUniqueLicense(data, input.licenseNumber ?? "");
    data.driverProfiles.push({
      employeeNumber:
        input.employeeNumber?.trim() ??
        `DRV-${user.id.slice(-8).toUpperCase()}`,
      id: createId("driver-profile"),
      licenseNumber: input.licenseNumber?.trim() ?? "",
      phone: input.phone?.trim() ?? "",
      status: "Available",
      userId: user.id,
    });
  } else if (user.role === "mechanic") {
    if (!isRequired(input.specialization ?? "")) {
      throw new ManagementError(
        "invalid_record",
        "Enter a mechanic specialization.",
      );
    }
    data.mechanicProfiles.push({
      employeeNumber:
        input.employeeNumber?.trim() ??
        `MEC-${user.id.slice(-8).toUpperCase()}`,
      id: createId("mechanic-profile"),
      phone: input.phone?.trim() ?? "",
      specialization: input.specialization?.trim() ?? "",
      status: "Active",
      userId: user.id,
    });
  } else if (user.role === "manager") {
    if (!isRequired(input.depot ?? "")) {
      throw new ManagementError("invalid_record", "Enter a manager depot.");
    }
    data.managerProfiles.push({
      depot: input.depot?.trim() ?? "",
      id: createId("manager-profile"),
      userId: user.id,
    });
  }
}

function getUser(data: MutableFleetData, userId: string) {
  const user = data.users.find((item) => item.id === userId);
  if (!user) throw new ManagementError("not_found", "User account not found.");
  return user;
}

function validateVehicle(
  input: VehicleInput,
  data: MutableFleetData,
  excludedVehicleId?: string,
) {
  if (
    !isRequired(input.fleetNumber) ||
    !isRequired(input.plateNumber) ||
    !isRequired(input.vin) ||
    !isRequired(input.make) ||
    !isRequired(input.model) ||
    !isRequired(input.type) ||
    input.year < 1980 ||
    input.year > new Date().getFullYear() + 1 ||
    !Number.isFinite(input.currentMileage) ||
    input.currentMileage < 0
  ) {
    throw new ManagementError(
      "invalid_record",
      "Complete all vehicle fields with a valid year and non-negative mileage.",
    );
  }
  if (
    data.vehicles.some(
      (vehicle) =>
        vehicle.id !== excludedVehicleId &&
        normalize(vehicle.fleetNumber) === normalize(input.fleetNumber),
    )
  ) {
    throw new ManagementError(
      "duplicate_fleet_number",
      "That fleet number is already in use.",
    );
  }
  if (
    data.vehicles.some(
      (vehicle) =>
        vehicle.id !== excludedVehicleId &&
        normalize(vehicle.plateNumber) === normalize(input.plateNumber),
    )
  ) {
    throw new ManagementError(
      "duplicate_plate",
      "That plate number is already in use.",
    );
  }
  if (
    data.vehicles.some(
      (vehicle) =>
        vehicle.id !== excludedVehicleId &&
        normalize(vehicle.vin) === normalize(input.vin),
    )
  ) {
    throw new ManagementError(
      "duplicate_plate",
      "That vehicle identification number is already in use.",
    );
  }
}

function ensureVehicleCanBeDeactivated(
  data: MutableFleetData,
  vehicleId: string,
) {
  if (
    data.assignments.some(
      (assignment) =>
        assignment.vehicleId === vehicleId && assignment.status === "Active",
    )
  ) {
    throw new ManagementError(
      "linked_record",
      "End the active driver assignment before taking this vehicle out of service.",
    );
  }
  if (
    data.maintenanceWorkOrders.some(
      (record) =>
        record.vehicleId === vehicleId &&
        record.status !== "completed" &&
        record.status !== "cancelled",
    )
  ) {
    throw new ManagementError(
      "linked_record",
      "Complete or reassign open maintenance work before taking this vehicle out of service.",
    );
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function requireOperationsRole(
  data: MutableFleetData,
  actorUserId: string,
  roles: User["role"][],
) {
  const actor = getUser(data, actorUserId);
  if (actor.status !== "Active" || !roles.includes(actor.role)) {
    throw new OperationsError(
      "unauthorized",
      "Your current role cannot perform this operation.",
    );
  }
  return actor;
}

function getDriverProfile(data: MutableFleetData, profileId: string) {
  const profile = data.driverProfiles.find((item) => item.id === profileId);
  if (!profile) throw new OperationsError("not_found", "Driver not found.");
  return profile;
}

function getMechanicProfile(data: MutableFleetData, profileId: string) {
  const profile = data.mechanicProfiles.find((item) => item.id === profileId);
  if (!profile) throw new OperationsError("not_found", "Mechanic not found.");
  const user = getUser(data, profile.userId);
  if (profile.status !== "Active" || user.status !== "Active") {
    throw new OperationsError(
      "invalid_record",
      "Select an active mechanic account.",
    );
  }
  return profile;
}

function getVehicle(data: MutableFleetData, vehicleId: string) {
  const vehicle = data.vehicles.find((item) => item.id === vehicleId);
  if (!vehicle) throw new OperationsError("not_found", "Vehicle not found.");
  return vehicle;
}

function getServiceType(data: MutableFleetData, serviceTypeId: string) {
  const serviceType = data.serviceTypes.find(
    (item) => item.id === serviceTypeId,
  );
  if (!serviceType) {
    throw new OperationsError("not_found", "Service type not found.");
  }
  return serviceType;
}

function getWorkOrder(data: MutableFleetData, workOrderId: string) {
  const workOrder = data.maintenanceWorkOrders.find(
    (item) => item.id === workOrderId,
  );
  if (!workOrder) {
    throw new OperationsError("not_found", "Work order not found.");
  }
  return workOrder;
}

function logActivity(
  data: MutableFleetData,
  actorUserId: string,
  action: string,
  entityType: AuditEntityType,
  entityId: string,
  description: string,
) {
  const actor = getUser(data, actorUserId);
  data.auditEvents.unshift({
    action,
    createdAt: new Date().toISOString(),
    description,
    entityId,
    entityType,
    id: createId("activity"),
    role: actor.role,
    userId: actorUserId,
  });
}

function addNotification(
  data: MutableFleetData,
  notification: Omit<Notification, "createdAt" | "id" | "readAt">,
) {
  data.notifications.unshift({
    ...notification,
    createdAt: new Date().toISOString(),
    id: createId("notification"),
    readAt: null,
  });
}

function notificationBelongsToUser(notification: Notification, user: User) {
  return notification.userId === user.id;
}

function requireSharedRole(
  data: MutableFleetData,
  actorUserId: string,
  roles: User["role"][],
) {
  const actor = getUser(data, actorUserId);
  if (actor.status !== "Active" || !roles.includes(actor.role)) {
    throw new SharedFeatureError(
      "unauthorized",
      "Your current role cannot perform this action.",
    );
  }
  return actor;
}

function getActiveDriverAssignment(data: MutableFleetData, userId: string) {
  const profile = data.driverProfiles.find((item) => item.userId === userId);
  if (!profile) {
    throw new SharedFeatureError(
      "not_found",
      "No driver profile is linked to this account.",
    );
  }
  if (profile.status !== "Assigned") {
    throw new SharedFeatureError(
      "no_assignment",
      "A current vehicle assignment is required for mileage submission.",
    );
  }
  const assignment = data.assignments.find(
    (item) => item.driverId === profile.id && item.status === "Active",
  );
  if (!assignment) {
    throw new SharedFeatureError(
      "no_assignment",
      "A current vehicle assignment is required for mileage submission.",
    );
  }
  return { assignment, profile };
}

const WORK_ORDER_TRANSITIONS: Record<
  WorkOrderStatus,
  readonly WorkOrderStatus[]
> = {
  assigned: ["in_progress", "cancelled"],
  cancelled: [],
  completed: [],
  in_progress: ["completed", "cancelled"],
  scheduled: ["assigned", "cancelled"],
};

function validateWorkOrderTransition(
  currentStatus: WorkOrderStatus,
  nextStatus: WorkOrderStatus,
) {
  if (!WORK_ORDER_TRANSITIONS[currentStatus].includes(nextStatus)) {
    throw new OperationsError(
      "invalid_transition",
      `A ${currentStatus.replace("_", " ")} work order cannot move to ${nextStatus.replace("_", " ")}.`,
    );
  }
}

export const fleetDataService = {
  getSnapshot(): FleetState {
    return readData();
  },

  async load(): Promise<FleetState> {
    await delay();
    return readData();
  },

  async createUser(input: UserAccountInput) {
    await delay();
    const data = readData();
    validatePerson(input.fullName, input.email);
    ensureUniqueEmail(data, input.email);
    const user: User = {
      email: normalize(input.email),
      fullName: input.fullName.trim(),
      id: createId("fleet-user"),
      role: input.role,
      status: "Active",
    };
    addRoleProfile(data, user, input);
    data.users.push(user);
    writeData(data);
    return user;
  },

  async registerSelfServiceAccount(
    authUser: AuthUser,
    input: Pick<UserAccountInput, "licenseNumber" | "specialization">,
  ) {
    await delay();
    if (authUser.role !== "driver" && authUser.role !== "mechanic") {
      throw new ManagementError(
        "invalid_record",
        "Only Driver and Mechanic accounts can use self-service registration.",
      );
    }
    const data = readData();
    validatePerson(authUser.fullName, authUser.email);
    ensureUniqueEmail(data, authUser.email);
    if (data.users.some((user) => user.id === authUser.id)) {
      throw new ManagementError(
        "duplicate_email",
        "That account is already linked to fleet records.",
      );
    }
    const user: User = {
      ...authUser,
      status: "Active",
    };
    addRoleProfile(data, user, {
      ...input,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    });
    data.users.push(user);
    writeData(data);
    return user;
  },

  async updateUser(userId: string, input: UserAccountUpdateInput) {
    await delay();
    const data = readData();
    const user = getUser(data, userId);
    validatePerson(input.fullName, input.email);
    ensureUniqueEmail(data, input.email, userId);
    user.email = normalize(input.email);
    user.fullName = input.fullName.trim();

    const driver = data.driverProfiles.find((item) => item.userId === userId);
    if (driver) {
      ensureUniqueLicense(data, input.licenseNumber ?? "", driver.id);
      driver.employeeNumber =
        input.employeeNumber?.trim() ?? driver.employeeNumber;
      driver.licenseNumber = input.licenseNumber?.trim() ?? "";
      driver.phone = input.phone?.trim() ?? driver.phone;
    }
    const mechanic = data.mechanicProfiles.find(
      (item) => item.userId === userId,
    );
    if (mechanic) {
      if (!isRequired(input.specialization ?? "")) {
        throw new ManagementError(
          "invalid_record",
          "Enter a mechanic specialization.",
        );
      }
      mechanic.employeeNumber =
        input.employeeNumber?.trim() ?? mechanic.employeeNumber;
      mechanic.phone = input.phone?.trim() ?? mechanic.phone;
      mechanic.specialization = input.specialization?.trim() ?? "";
    }
    const manager = data.managerProfiles.find((item) => item.userId === userId);
    if (manager) {
      if (!isRequired(input.depot ?? "")) {
        throw new ManagementError("invalid_record", "Enter a manager depot.");
      }
      manager.depot = input.depot?.trim() ?? "";
    }
    writeData(data);
    return user;
  },

  async createDriver(input: DriverAccountInput) {
    return this.createUser({ ...input, role: "driver" });
  },

  async createMechanic(input: MechanicAccountInput) {
    return this.createUser({ ...input, role: "mechanic" });
  },

  async deactivateUser(userId: string, actorUserId: string) {
    await delay();
    const data = readData();
    const user = getUser(data, userId);
    if (user.id === actorUserId) {
      throw new ManagementError(
        "self_deactivation",
        "You cannot deactivate the account used by your current session.",
      );
    }
    const driver = data.driverProfiles.find((item) => item.userId === userId);
    if (
      driver &&
      data.assignments.some(
        (assignment) =>
          assignment.driverId === driver.id && assignment.status === "Active",
      )
    ) {
      throw new ManagementError(
        "linked_record",
        "End the driver's active vehicle assignment before deactivating this account.",
      );
    }
    const mechanic = data.mechanicProfiles.find(
      (item) => item.userId === userId,
    );
    if (
      mechanic &&
      data.maintenanceWorkOrders.some(
        (record) =>
          record.assignedMechanicId === mechanic.id &&
          record.status !== "completed" &&
          record.status !== "cancelled",
      )
    ) {
      throw new ManagementError(
        "linked_record",
        "Reassign or complete the mechanic's open maintenance work before deactivation.",
      );
    }
    user.status = "Inactive";
    if (driver) driver.status = "Inactive";
    if (mechanic) mechanic.status = "Inactive";
    writeData(data);
    return user;
  },

  async deactivateDriver(profileId: string, actorUserId: string) {
    const data = readData();
    const profile = data.driverProfiles.find((item) => item.id === profileId);
    if (!profile)
      throw new ManagementError("not_found", "Driver profile not found.");
    return this.deactivateUser(profile.userId, actorUserId);
  },

  async deactivateMechanic(profileId: string, actorUserId: string) {
    const data = readData();
    const profile = data.mechanicProfiles.find((item) => item.id === profileId);
    if (!profile) {
      throw new ManagementError("not_found", "Mechanic profile not found.");
    }
    return this.deactivateUser(profile.userId, actorUserId);
  },

  async createVehicle(input: VehicleInput) {
    await delay();
    const data = readData();
    validateVehicle(input, data);
    const vehicle: Vehicle = {
      ...input,
      currentMileage: input.currentMileage,
      fleetNumber: input.fleetNumber.trim().toUpperCase(),
      id: createId("vehicle"),
      make: input.make.trim(),
      model: input.model.trim(),
      plateNumber: input.plateNumber.trim().toUpperCase(),
      type: input.type.trim(),
      vin: input.vin.trim().toUpperCase(),
    };
    data.vehicles.push(vehicle);
    writeData(data);
    return vehicle;
  },

  async updateVehicle(vehicleId: string, input: VehicleInput) {
    await delay();
    const data = readData();
    const vehicle = data.vehicles.find((item) => item.id === vehicleId);
    if (!vehicle) throw new ManagementError("not_found", "Vehicle not found.");
    validateVehicle(input, data, vehicleId);
    if (input.currentMileage !== vehicle.currentMileage) {
      throw new ManagementError(
        "invalid_record",
        "Record odometer changes through the assigned driver's mileage workflow.",
      );
    }
    if (
      input.status === "Out of Service" &&
      vehicle.status !== "Out of Service"
    ) {
      ensureVehicleCanBeDeactivated(data, vehicleId);
    }
    Object.assign(vehicle, {
      ...input,
      fleetNumber: input.fleetNumber.trim().toUpperCase(),
      make: input.make.trim(),
      model: input.model.trim(),
      plateNumber: input.plateNumber.trim().toUpperCase(),
      type: input.type.trim(),
      vin: input.vin.trim().toUpperCase(),
    });
    writeData(data);
    return vehicle;
  },

  async deactivateVehicle(vehicleId: string) {
    await delay();
    const data = readData();
    const vehicle = data.vehicles.find((item) => item.id === vehicleId);
    if (!vehicle) throw new ManagementError("not_found", "Vehicle not found.");
    ensureVehicleCanBeDeactivated(data, vehicleId);
    vehicle.status = "Out of Service";
    writeData(data);
    return vehicle;
  },

  async createAssignment(input: AssignmentInput, actorUserId: string) {
    await delay();
    const data = readData();
    requireOperationsRole(data, actorUserId, ["admin", "manager"]);
    if (!isValidDate(input.startDate) || input.startDate > today()) {
      throw new OperationsError(
        "invalid_date",
        "Choose a valid assignment start date that is not in the future.",
      );
    }

    const driver = getDriverProfile(data, input.driverId);
    const driverUser = getUser(data, driver.userId);
    if (driver.status !== "Available" || driverUser.status !== "Active") {
      throw new OperationsError(
        "ineligible_driver",
        "Only an active, available driver can receive an assignment.",
      );
    }
    const vehicle = getVehicle(data, input.vehicleId);
    if (vehicle.status !== "Active") {
      throw new OperationsError(
        "unavailable_vehicle",
        "Only an active, available vehicle can be assigned.",
      );
    }
    if (
      data.assignments.some(
        (assignment) =>
          assignment.status === "Active" &&
          (assignment.driverId === driver.id ||
            assignment.vehicleId === vehicle.id),
      )
    ) {
      throw new OperationsError(
        "assignment_conflict",
        "The selected driver or vehicle already has an active assignment.",
      );
    }

    const assignment: VehicleAssignment = {
      driverId: driver.id,
      endDate: null,
      id: createId("assignment"),
      startDate: input.startDate,
      status: "Active",
      vehicleId: vehicle.id,
    };
    data.assignments.push(assignment);
    driver.status = "Assigned";
    addNotification(data, {
      message: `${vehicle.fleetNumber} (${vehicle.plateNumber}) is now assigned to you.`,
      relatedRoute: "/driver/dashboard",
      title: "New vehicle assignment",
      type: "Assignment",
      userId: driverUser.id,
    });
    logActivity(
      data,
      actorUserId,
      "Created vehicle assignment",
      "assignment",
      assignment.id,
      `${vehicle.fleetNumber} to ${driverUser.fullName}`,
    );
    writeData(data);
    return assignment;
  },

  async endAssignment(
    assignmentId: string,
    endDate: string,
    actorUserId: string,
  ) {
    await delay();
    const data = readData();
    requireOperationsRole(data, actorUserId, ["admin", "manager"]);
    const assignment = data.assignments.find(
      (item) => item.id === assignmentId,
    );
    if (!assignment) {
      throw new OperationsError("not_found", "Assignment not found.");
    }
    if (assignment.status !== "Active") {
      throw new OperationsError(
        "invalid_record",
        "This assignment has already ended.",
      );
    }
    if (
      !isValidDate(endDate) ||
      endDate < assignment.startDate ||
      endDate > today()
    ) {
      throw new OperationsError(
        "invalid_date",
        "The assignment end date must be between its start date and today.",
      );
    }
    assignment.endDate = endDate;
    assignment.status = "Ended";
    const driver = getDriverProfile(data, assignment.driverId);
    if (driver.status !== "Inactive") driver.status = "Available";
    const vehicle = getVehicle(data, assignment.vehicleId);
    logActivity(
      data,
      actorUserId,
      "Ended vehicle assignment",
      "assignment",
      assignment.id,
      vehicle.fleetNumber,
    );
    writeData(data);
    return assignment;
  },

  async createMaintenanceSchedule(
    input: MaintenanceScheduleInput,
    actorUserId: string,
  ) {
    await delay();
    const data = readData();
    requireOperationsRole(data, actorUserId, ["admin", "manager"]);
    if (!isValidDate(input.dueDate)) {
      throw new OperationsError(
        "invalid_date",
        "Choose a valid maintenance date.",
      );
    }
    const vehicle = getVehicle(data, input.vehicleId);
    const serviceType = getServiceType(data, input.serviceTypeId);
    if (serviceType.status !== "Active") {
      throw new OperationsError(
        "invalid_record",
        "Select an active service type.",
      );
    }
    const assignedMechanicId = input.assignedMechanicId || null;
    if (assignedMechanicId) getMechanicProfile(data, assignedMechanicId);
    const schedule: MaintenanceSchedule = {
      createdAt: new Date().toISOString(),
      assignedMechanicId,
      dueDate: input.dueDate,
      id: createId("schedule"),
      notes: input.notes.trim(),
      requestedByUserId: actorUserId,
      serviceTypeId: serviceType.id,
      status: "Planned",
      vehicleId: vehicle.id,
      workOrderId: null,
    };
    data.maintenanceSchedules.push(schedule);
    const activeAssignment = data.assignments.find(
      (assignment) =>
        assignment.vehicleId === vehicle.id && assignment.status === "Active",
    );
    const assignedDriver = activeAssignment
      ? data.driverProfiles.find(
          (profile) => profile.id === activeAssignment.driverId,
        )
      : undefined;
    if (assignedDriver) {
      addNotification(data, {
        message: `${serviceType.name} for ${vehicle.fleetNumber} was manually planned for ${input.dueDate}.`,
        relatedRoute: "/driver/maintenance",
        title: "Maintenance plan created",
        type: "Schedule",
        userId: assignedDriver.userId,
      });
    }
    if (assignedMechanicId) {
      const mechanic = getMechanicProfile(data, assignedMechanicId);
      addNotification(data, {
        message: `${serviceType.name} for ${vehicle.fleetNumber} is planned for ${input.dueDate}.`,
        relatedRoute: "/mechanic/dashboard",
        title: "Maintenance schedule assigned",
        type: "Schedule",
        userId: mechanic.userId,
      });
    }
    logActivity(
      data,
      actorUserId,
      "Created maintenance schedule",
      "maintenance_schedule",
      schedule.id,
      `${vehicle.fleetNumber} ${serviceType.name}`,
    );
    writeData(data);
    return schedule;
  },

  async cancelMaintenanceSchedule(scheduleId: string, actorUserId: string) {
    await delay();
    const data = readData();
    requireOperationsRole(data, actorUserId, ["admin", "manager"]);
    const schedule = data.maintenanceSchedules.find(
      (item) => item.id === scheduleId,
    );
    if (!schedule) {
      throw new OperationsError("not_found", "Schedule not found.");
    }
    if (schedule.status === "Converted") {
      throw new OperationsError(
        "invalid_record",
        "This schedule already has a linked work order and cannot be cancelled.",
      );
    }
    if (schedule.status === "Cancelled") return schedule;
    schedule.status = "Cancelled";
    logActivity(
      data,
      actorUserId,
      "Cancelled maintenance schedule",
      "maintenance_schedule",
      schedule.id,
      schedule.id,
    );
    writeData(data);
    return schedule;
  },

  async createWorkOrder(input: WorkOrderInput, actorUserId: string) {
    await delay();
    const data = readData();
    requireOperationsRole(data, actorUserId, ["admin", "manager"]);
    if (!isValidDate(input.scheduledDate)) {
      throw new OperationsError(
        "invalid_date",
        "Choose a valid work-order date.",
      );
    }
    const vehicle = getVehicle(data, input.vehicleId);
    const serviceType = getServiceType(data, input.serviceTypeId);
    if (serviceType.status !== "Active" && !input.scheduleId) {
      throw new OperationsError(
        "invalid_record",
        "Select an active service type.",
      );
    }
    const assignedMechanicId = input.assignedMechanicId || null;
    if (assignedMechanicId) getMechanicProfile(data, assignedMechanicId);

    const schedule = input.scheduleId
      ? data.maintenanceSchedules.find((item) => item.id === input.scheduleId)
      : undefined;
    if (input.scheduleId && !schedule) {
      throw new OperationsError("not_found", "Schedule not found.");
    }
    if (
      schedule &&
      (schedule.status === "Converted" || schedule.status === "Cancelled")
    ) {
      throw new OperationsError(
        "invalid_record",
        "The selected schedule cannot create another work order.",
      );
    }
    if (
      schedule &&
      (schedule.vehicleId !== vehicle.id ||
        schedule.serviceTypeId !== serviceType.id)
    ) {
      throw new OperationsError(
        "invalid_record",
        "The work order must use the vehicle and service type from its schedule.",
      );
    }

    const workOrder = {
      assignedMechanicId,
      createdAt: new Date().toISOString(),
      id: createId("work-order"),
      notes: input.notes.trim(),
      priority: input.priority,
      requestedByUserId: actorUserId,
      scheduleId: schedule?.id ?? null,
      scheduledDate: input.scheduledDate,
      serviceNotes: "",
      serviceTypeId: serviceType.id,
      status: assignedMechanicId ? "assigned" : "scheduled",
      vehicleId: vehicle.id,
    } satisfies MutableFleetData["maintenanceWorkOrders"][number];
    data.maintenanceWorkOrders.push(workOrder);
    if (schedule) {
      schedule.status = "Converted";
      schedule.workOrderId = workOrder.id;
    }
    if (assignedMechanicId) {
      const mechanic = getMechanicProfile(data, assignedMechanicId);
      addNotification(data, {
        message: `${serviceType.name} for ${vehicle.fleetNumber} is assigned to you for ${input.scheduledDate}.`,
        relatedRoute: "/maintenance/work-orders",
        title: "Work order assigned",
        type: "Maintenance",
        userId: mechanic.userId,
      });
    }
    logActivity(
      data,
      actorUserId,
      "Created maintenance work order",
      "maintenance_work_order",
      workOrder.id,
      `${vehicle.fleetNumber} ${serviceType.name}`,
    );
    writeData(data);
    return workOrder;
  },

  async assignWorkOrder(
    workOrderId: string,
    assignedMechanicId: string,
    actorUserId: string,
  ) {
    await delay();
    const data = readData();
    requireOperationsRole(data, actorUserId, ["admin", "manager"]);
    const workOrder = getWorkOrder(data, workOrderId);
    if (workOrder.status === "scheduled") {
      validateWorkOrderTransition(workOrder.status, "assigned");
    } else if (workOrder.status !== "assigned") {
      throw new OperationsError(
        "invalid_transition",
        "Only scheduled or assigned work can be assigned to a mechanic.",
      );
    }
    const mechanic = getMechanicProfile(data, assignedMechanicId);
    workOrder.assignedMechanicId = mechanic.id;
    workOrder.status = "assigned";
    const assignedVehicle = getVehicle(data, workOrder.vehicleId);
    const assignedService = getServiceType(data, workOrder.serviceTypeId);
    addNotification(data, {
      message: `${assignedService.name} for ${assignedVehicle.fleetNumber} is assigned to you.`,
      relatedRoute: "/maintenance/work-orders",
      title: "Work order assigned",
      type: "Maintenance",
      userId: mechanic.userId,
    });
    logActivity(
      data,
      actorUserId,
      "Assigned maintenance work order",
      "maintenance_work_order",
      workOrder.id,
      workOrder.id,
    );
    writeData(data);
    return workOrder;
  },

  async transitionWorkOrder(
    workOrderId: string,
    input: WorkOrderTransitionInput,
  ) {
    await delay();
    const data = readData();
    const actor = requireOperationsRole(data, input.actorUserId, [
      "admin",
      "manager",
      "mechanic",
    ]);
    const workOrder = getWorkOrder(data, workOrderId);
    if (actor.role === "mechanic") {
      const mechanic = data.mechanicProfiles.find(
        (profile) => profile.userId === actor.id,
      );
      if (!mechanic || workOrder.assignedMechanicId !== mechanic.id) {
        throw new OperationsError(
          "unauthorized",
          "Mechanics can update only work assigned to their account.",
        );
      }
      if (
        !(["in_progress", "completed"] as WorkOrderStatus[]).includes(
          input.status,
        )
      ) {
        throw new OperationsError(
          "unauthorized",
          "Mechanics can start or complete their assigned work.",
        );
      }
    }
    if (
      actor.role === "manager" &&
      !(["assigned", "cancelled"] as WorkOrderStatus[]).includes(input.status)
    ) {
      throw new OperationsError(
        "unauthorized",
        "Managers may assign or cancel work, but only the assigned mechanic or an administrator may perform service work.",
      );
    }
    validateWorkOrderTransition(workOrder.status, input.status);
    if (
      workOrder.status === "in_progress" &&
      input.status === "cancelled" &&
      !input.confirmCancellation
    ) {
      throw new OperationsError(
        "invalid_transition",
        "Cancelling work in progress requires explicit confirmation.",
      );
    }
    if (input.status === "in_progress" && !workOrder.assignedMechanicId) {
      throw new OperationsError(
        "invalid_transition",
        "Assign a mechanic before starting this work order.",
      );
    }
    if (input.status === "completed") {
      if (!workOrder.assignedMechanicId) {
        throw new OperationsError(
          "invalid_transition",
          "Assign a mechanic before completing this work order.",
        );
      }
      if (
        data.maintenanceHistory.some(
          (record) => record.workOrderId === workOrder.id,
        )
      ) {
        throw new OperationsError(
          "invalid_transition",
          "This work order already has a maintenance-history record.",
        );
      }
      if (!isRequired(input.serviceNotes ?? "")) {
        throw new OperationsError(
          "invalid_record",
          "Add service notes before completing this work order.",
        );
      }
      if (
        !Number.isFinite(input.odometerAtService) ||
        !Number.isInteger(input.odometerAtService) ||
        (input.odometerAtService ?? -1) < 0
      ) {
        throw new OperationsError(
          "invalid_record",
          "Enter a valid whole-number odometer reading.",
        );
      }
      if (!Number.isFinite(input.totalCost) || (input.totalCost ?? -1) < 0) {
        throw new OperationsError(
          "invalid_record",
          "Enter a valid non-negative service cost.",
        );
      }
    }
    if (input.serviceNotes !== undefined) {
      workOrder.serviceNotes = input.serviceNotes.trim();
    }
    workOrder.status = input.status;
    const vehicle = getVehicle(data, workOrder.vehicleId);
    const serviceType = getServiceType(data, workOrder.serviceTypeId);
    if (
      input.status === "completed" &&
      (input.odometerAtService ?? -1) < vehicle.currentMileage
    ) {
      throw new OperationsError(
        "invalid_record",
        `Service mileage cannot be lower than the vehicle's current ${vehicle.currentMileage.toLocaleString()} km.`,
      );
    }
    if (input.status === "in_progress") vehicle.status = "Maintenance";
    if (input.status === "cancelled" && vehicle.status === "Maintenance") {
      const hasOtherActiveWork = data.maintenanceWorkOrders.some(
        (record) =>
          record.id !== workOrder.id &&
          record.vehicleId === vehicle.id &&
          record.status === "in_progress",
      );
      if (!hasOtherActiveWork) vehicle.status = "Active";
    }
    if (input.status === "completed") {
      const odometerAtService = input.odometerAtService as number;
      const totalCost = input.totalCost as number;
      if (odometerAtService > vehicle.currentMileage) {
        vehicle.currentMileage = odometerAtService;
      }
      const hasOtherActiveWork = data.maintenanceWorkOrders.some(
        (record) =>
          record.id !== workOrder.id &&
          record.vehicleId === vehicle.id &&
          record.status === "in_progress",
      );
      if (vehicle.status === "Maintenance" && !hasOtherActiveWork) {
        vehicle.status = "Active";
      }
      const activeAssignment = data.assignments.find(
        (assignment) =>
          assignment.vehicleId === vehicle.id && assignment.status === "Active",
      );
      const driver = activeAssignment
        ? data.driverProfiles.find(
            (profile) => profile.id === activeAssignment.driverId,
          )
        : undefined;
      const history = {
        id: createId("maintenance-history"),
        mechanicId: workOrder.assignedMechanicId as string,
        notes: workOrder.serviceNotes,
        odometerAtService,
        serviceDate: today(),
        serviceTypeId: workOrder.serviceTypeId,
        totalCost,
        vehicleId: workOrder.vehicleId,
        workOrderId: workOrder.id,
      } satisfies MutableFleetData["maintenanceHistory"][number];
      data.maintenanceHistory.push(history);

      const recipientIds = new Set<string>();
      data.users
        .filter(
          (user) =>
            user.status === "Active" &&
            (user.role === "admin" || user.id === workOrder.requestedByUserId),
        )
        .forEach((user) => recipientIds.add(user.id));
      if (driver) recipientIds.add(driver.userId);
      const mechanic = getMechanicProfile(
        data,
        workOrder.assignedMechanicId as string,
      );
      recipientIds.add(mechanic.userId);
      recipientIds.forEach((userId) => {
        const recipient = getUser(data, userId);
        addNotification(data, {
          message: `${serviceType.name} for ${vehicle.fleetNumber} was completed at ${odometerAtService.toLocaleString()} km.`,
          relatedRoute:
            recipient.role === "driver"
              ? "/driver/maintenance"
              : "/maintenance/history",
          title: "Vehicle maintenance completed",
          type: "Maintenance",
          userId,
        });
      });
      logActivity(
        data,
        input.actorUserId,
        "Created maintenance history",
        "maintenance_history",
        history.id,
        `${vehicle.fleetNumber} ${serviceType.name} at ${odometerAtService} km`,
      );
    } else if (input.status === "cancelled") {
      const activeAssignment = data.assignments.find(
        (assignment) =>
          assignment.vehicleId === vehicle.id && assignment.status === "Active",
      );
      const driver = activeAssignment
        ? data.driverProfiles.find(
            (profile) => profile.id === activeAssignment.driverId,
          )
        : undefined;
      const recipientIds = new Set<string>([workOrder.requestedByUserId]);
      data.users
        .filter((user) => user.status === "Active" && user.role === "admin")
        .forEach((user) => recipientIds.add(user.id));
      if (workOrder.assignedMechanicId) {
        const mechanic = data.mechanicProfiles.find(
          (profile) => profile.id === workOrder.assignedMechanicId,
        );
        if (mechanic) recipientIds.add(mechanic.userId);
      }
      if (driver) recipientIds.add(driver.userId);
      recipientIds.forEach((userId) => {
        const recipient = data.users.find((user) => user.id === userId);
        if (!recipient || recipient.status !== "Active") return;
        addNotification(data, {
          message: `${serviceType.name} for ${vehicle.fleetNumber} was cancelled.`,
          relatedRoute:
            recipient.role === "driver"
              ? "/driver/maintenance"
              : "/maintenance/work-orders",
          title: "Work order cancelled",
          type: "Maintenance",
          userId,
        });
      });
    }
    logActivity(
      data,
      input.actorUserId,
      `Updated work order to ${input.status.replace("_", " ")}`,
      "maintenance_work_order",
      workOrder.id,
      workOrder.id,
    );
    writeData(data);
    return workOrder;
  },

  async updateWorkOrderServiceNotes(
    workOrderId: string,
    serviceNotes: string,
    actorUserId: string,
  ) {
    await delay();
    const data = readData();
    const actor = requireOperationsRole(data, actorUserId, [
      "admin",
      "mechanic",
    ]);
    const workOrder = getWorkOrder(data, workOrderId);
    if (actor.role === "mechanic") {
      const mechanic = data.mechanicProfiles.find(
        (profile) => profile.userId === actor.id,
      );
      if (!mechanic || workOrder.assignedMechanicId !== mechanic.id) {
        throw new OperationsError(
          "unauthorized",
          "Mechanics can add notes only to their assigned work.",
        );
      }
    }
    if (workOrder.status === "cancelled" || workOrder.status === "completed") {
      throw new OperationsError(
        "invalid_record",
        "Completed or cancelled work orders cannot be edited.",
      );
    }
    workOrder.serviceNotes = serviceNotes.trim();
    logActivity(
      data,
      actorUserId,
      "Updated work-order service notes",
      "maintenance_work_order",
      workOrder.id,
      workOrder.id,
    );
    writeData(data);
    return workOrder;
  },

  async correctMaintenanceHistory(
    historyId: string,
    input: MaintenanceHistoryCorrectionInput,
    actorUserId: string,
  ) {
    await delay();
    const data = readData();
    requireOperationsRole(data, actorUserId, ["admin"]);
    const history = data.maintenanceHistory.find(
      (record) => record.id === historyId,
    );
    if (!history) {
      throw new OperationsError("not_found", "Maintenance history not found.");
    }
    if (
      !isValidDate(input.serviceDate) ||
      input.serviceDate > today() ||
      !Number.isInteger(input.odometerAtService) ||
      input.odometerAtService < 0 ||
      !Number.isFinite(input.totalCost) ||
      input.totalCost < 0 ||
      !isRequired(input.notes)
    ) {
      throw new OperationsError(
        "invalid_record",
        "Enter a valid past or current service date, whole-number mileage, non-negative cost, and correction notes.",
      );
    }
    const previous = `${history.serviceDate}; ${history.odometerAtService} km; ${history.totalCost}`;
    history.serviceDate = input.serviceDate;
    history.odometerAtService = input.odometerAtService;
    history.totalCost = input.totalCost;
    history.notes = input.notes.trim();
    const vehicle = getVehicle(data, history.vehicleId);
    if (history.odometerAtService > vehicle.currentMileage) {
      vehicle.currentMileage = history.odometerAtService;
    }
    logActivity(
      data,
      actorUserId,
      "Corrected maintenance history",
      "maintenance_history",
      history.id,
      `${previous} -> ${history.serviceDate}; ${history.odometerAtService} km; ${history.totalCost}`,
    );
    writeData(data);
    return history;
  },

  async createServiceType(input: ServiceTypeInput, actorUserId: string) {
    await delay();
    const data = readData();
    requireOperationsRole(data, actorUserId, ["admin"]);
    if (
      !isRequired(input.name) ||
      !isRequired(input.description) ||
      !Number.isInteger(input.recommendedIntervalKm) ||
      input.recommendedIntervalKm <= 0
    ) {
      throw new OperationsError(
        "invalid_record",
        "Enter a service type name, description, and positive whole-kilometre interval.",
      );
    }
    if (
      data.serviceTypes.some(
        (serviceType) => normalize(serviceType.name) === normalize(input.name),
      )
    ) {
      throw new OperationsError(
        "invalid_record",
        "A service type with that name already exists.",
      );
    }
    const serviceType: ServiceType = {
      description: input.description.trim(),
      id: createId("service-type"),
      name: input.name.trim(),
      recommendedIntervalKm: input.recommendedIntervalKm,
      status: "Active",
    };
    data.serviceTypes.push(serviceType);
    logActivity(
      data,
      actorUserId,
      "Created service type",
      "service_type",
      serviceType.id,
      serviceType.name,
    );
    writeData(data);
    return serviceType;
  },

  async updateServiceType(
    serviceTypeId: string,
    input: ServiceTypeInput,
    actorUserId: string,
  ) {
    await delay();
    const data = readData();
    requireOperationsRole(data, actorUserId, ["admin"]);
    const serviceType = getServiceType(data, serviceTypeId);
    if (
      !isRequired(input.name) ||
      !isRequired(input.description) ||
      !Number.isInteger(input.recommendedIntervalKm) ||
      input.recommendedIntervalKm <= 0
    ) {
      throw new OperationsError(
        "invalid_record",
        "Enter a service type name, description, and positive whole-kilometre interval.",
      );
    }
    if (
      data.serviceTypes.some(
        (item) =>
          item.id !== serviceTypeId &&
          normalize(item.name) === normalize(input.name),
      )
    ) {
      throw new OperationsError(
        "invalid_record",
        "A service type with that name already exists.",
      );
    }
    serviceType.name = input.name.trim();
    serviceType.description = input.description.trim();
    serviceType.recommendedIntervalKm = input.recommendedIntervalKm;
    logActivity(
      data,
      actorUserId,
      "Updated service type",
      "service_type",
      serviceType.id,
      serviceType.name,
    );
    writeData(data);
    return serviceType;
  },

  async deactivateServiceType(serviceTypeId: string, actorUserId: string) {
    await delay();
    const data = readData();
    requireOperationsRole(data, actorUserId, ["admin"]);
    const serviceType = getServiceType(data, serviceTypeId);
    serviceType.status = "Inactive";
    logActivity(
      data,
      actorUserId,
      "Deactivated service type",
      "service_type",
      serviceType.id,
      serviceType.name,
    );
    writeData(data);
    return serviceType;
  },

  async submitMileage(input: MileageSubmissionInput, actorUserId: string) {
    await delay();
    const data = readData();
    requireSharedRole(data, actorUserId, ["driver"]);
    const { assignment, profile } = getActiveDriverAssignment(
      data,
      actorUserId,
    );
    const vehicle = getVehicle(data, assignment.vehicleId);
    if (vehicle.status !== "Active") {
      throw new SharedFeatureError(
        "vehicle_unavailable",
        "Mileage cannot be submitted while the assigned vehicle is unavailable.",
      );
    }
    if (
      !isValidDate(input.submissionDate) ||
      input.submissionDate > today() ||
      input.submissionDate < assignment.startDate
    ) {
      throw new SharedFeatureError(
        "invalid_date",
        "Choose a submission date between the assignment start date and today.",
      );
    }
    const previousEntries = data.mileageLogs.filter(
      (entry) => entry.vehicleId === vehicle.id,
    );
    const latestSubmissionDate = previousEntries
      .map((entry) => entry.logDate.slice(0, 10))
      .sort()
      .at(-1);
    if (latestSubmissionDate && input.submissionDate < latestSubmissionDate) {
      throw new SharedFeatureError(
        "invalid_date",
        `The submission date cannot be earlier than ${latestSubmissionDate}.`,
      );
    }
    const latestVehicleLog = mileageService.getLatestVehicleLog(
      data,
      vehicle.id,
    );
    const currentOdometer = Math.max(
      vehicle.currentMileage,
      latestVehicleLog?.odometerReading ?? 0,
    );
    if (
      !Number.isFinite(input.odometerReading) ||
      !Number.isInteger(input.odometerReading) ||
      input.odometerReading < 0 ||
      input.odometerReading <= currentOdometer
    ) {
      throw new SharedFeatureError(
        "invalid_mileage",
        `Enter an odometer reading greater than ${currentOdometer.toLocaleString()} km.`,
      );
    }
    const previousServiceStatuses = mileageService.getVehicleServiceStatuses(
      data,
      vehicle.id,
      currentOdometer,
    );
    const submission = {
      driverId: profile.id,
      id: createId("mileage"),
      logDate: `${input.submissionDate}T12:00:00.000Z`,
      notes: input.notes.trim(),
      odometerReading: input.odometerReading,
      vehicleId: vehicle.id,
    } satisfies MutableFleetData["mileageLogs"][number];
    data.mileageLogs.push(submission);
    vehicle.currentMileage = input.odometerReading;
    const nextServiceStatuses = mileageService.getVehicleServiceStatuses(
      data,
      vehicle.id,
    );
    const crossedThresholds = mileageService.getCrossedServiceThresholds(
      previousServiceStatuses,
      nextServiceStatuses,
    );
    addNotification(data, {
      message: `${input.odometerReading.toLocaleString()} km was recorded for ${vehicle.fleetNumber}.`,
      relatedRoute: "/driver/mileage",
      title: "Mileage submission recorded",
      type: "Mileage",
      userId: actorUserId,
    });
    crossedThresholds.forEach((threshold) => {
      const serviceType = data.serviceTypes.find(
        (item) => item.id === threshold.serviceTypeId,
      );
      if (!serviceType || threshold.nextServiceMileage === null) return;
      const statusLabel = threshold.status.replaceAll("_", " ");
      addNotification(data, {
        message: `${vehicle.fleetNumber} is ${statusLabel} for ${serviceType.name}. The next service mileage is ${threshold.nextServiceMileage.toLocaleString()} km.`,
        relatedRoute: "/driver/mileage",
        title: `${serviceType.name}: ${statusLabel}`,
        type: "Reminder",
        userId: actorUserId,
      });
    });
    logActivity(
      data,
      actorUserId,
      "Submitted mileage",
      "mileage_log",
      submission.id,
      `${vehicle.fleetNumber} · ${input.odometerReading.toLocaleString()} km`,
    );
    writeData(data);
    return submission;
  },

  async markNotificationRead(notificationId: string, actorUserId: string) {
    await delay();
    const data = readData();
    const actor = getUser(data, actorUserId);
    const notification = data.notifications.find(
      (item) => item.id === notificationId,
    );
    if (!notification) {
      throw new SharedFeatureError("not_found", "Notification not found.");
    }
    if (!notificationBelongsToUser(notification, actor)) {
      throw new SharedFeatureError(
        "unauthorized",
        "This notification does not belong to your account.",
      );
    }
    notification.readAt = new Date().toISOString();
    writeData(data);
    return notification;
  },

  async markAllNotificationsRead(actorUserId: string) {
    await delay();
    const data = readData();
    const actor = getUser(data, actorUserId);
    const notifications = data.notifications.filter((notification) =>
      notificationBelongsToUser(notification, actor),
    );
    notifications.forEach((notification) => {
      notification.readAt ??= new Date().toISOString();
    });
    writeData(data);
    return notifications.length;
  },

  async updateOwnProfile(actorUserId: string, input: ProfileUpdateInput) {
    await delay();
    const data = readData();
    const actor = requireSharedRole(data, actorUserId, [
      "admin",
      "manager",
      "mechanic",
      "driver",
    ]);
    validatePerson(input.fullName, input.email);
    ensureUniqueEmail(data, input.email, actor.id);
    actor.fullName = input.fullName.trim();
    actor.email = normalize(input.email);
    logActivity(
      data,
      actor.id,
      "Updated profile",
      "profile",
      actor.id,
      actor.fullName,
    );
    writeData(data);
    return actor;
  },

  resetForTests() {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    window.localStorage.removeItem(OLDER_STORAGE_KEY);
  },
};

export const FLEET_DATA_STORAGE_KEY = STORAGE_KEY;
export const FLEET_DATA_CHANGED_EVENT = DATA_CHANGED_EVENT;
