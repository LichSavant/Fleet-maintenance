import { MOCK_FLEET_DATA } from "../data/mockFleetData";
import type { AuthUser } from "../types/auth";
import type {
  DriverProfile,
  FleetDataSource,
  FleetNotification,
  FleetUserRecord,
  ManagerProfile,
  MaintenanceRecord,
  MaintenanceSchedule,
  MechanicProfile,
  MileageSubmission,
  ServiceType,
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

const STORAGE_KEY = "forgefleet.frontend.fleet-data.v2";
const STORAGE_VERSION = 2;
const DEMO_DELAY_MS = 120;
const DATA_CHANGED_EVENT = "forgefleet:data-changed";

interface MutableFleetData {
  assignments: FleetDataSource["assignments"] extends readonly (infer T)[]
    ? T[]
    : never;
  driverProfiles: DriverProfile[];
  maintenanceRecords: FleetDataSource["maintenanceRecords"] extends readonly (infer T)[]
    ? T[]
    : never;
  maintenanceSchedules: FleetDataSource["maintenanceSchedules"] extends readonly (infer T)[]
    ? T[]
    : never;
  managerProfiles: ManagerProfile[];
  mechanicProfiles: MechanicProfile[];
  mileageSubmissions: FleetDataSource["mileageSubmissions"] extends readonly (infer T)[]
    ? T[]
    : never;
  notifications: FleetDataSource["notifications"] extends readonly (infer T)[]
    ? T[]
    : never;
  serviceTypes: ServiceType[];
  systemActivity: FleetDataSource["systemActivity"] extends readonly (infer T)[]
    ? T[]
    : never;
  users: FleetUserRecord[];
  vehicles: Vehicle[];
}

interface StoredFleetData {
  data: MutableFleetData;
  version: 2;
}

function delay() {
  return new Promise<void>((resolve) =>
    window.setTimeout(resolve, DEMO_DELAY_MS),
  );
}

function cloneData(data: FleetDataSource): MutableFleetData {
  return JSON.parse(JSON.stringify(data)) as MutableFleetData;
}

function isStoredFleetData(value: unknown): value is StoredFleetData {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<StoredFleetData>;
  const data = record.data as Partial<MutableFleetData> | undefined;
  return (
    record.version === STORAGE_VERSION &&
    Boolean(data) &&
    Array.isArray(data?.users) &&
    Array.isArray(data?.driverProfiles) &&
    Array.isArray(data?.mechanicProfiles) &&
    Array.isArray(data?.managerProfiles) &&
    Array.isArray(data?.vehicles) &&
    Array.isArray(data?.assignments) &&
    Array.isArray(data?.maintenanceRecords) &&
    Array.isArray(data?.maintenanceSchedules) &&
    Array.isArray(data?.mileageSubmissions) &&
    Array.isArray(data?.notifications) &&
    Array.isArray(data?.serviceTypes) &&
    Array.isArray(data?.systemActivity)
  );
}

function readData(): MutableFleetData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneData(MOCK_FLEET_DATA);
    const parsed: unknown = JSON.parse(raw);
    if (isStoredFleetData(parsed)) return cloneData(parsed.data);
    window.localStorage.removeItem(STORAGE_KEY);
    return cloneData(MOCK_FLEET_DATA);
  } catch {
    return cloneData(MOCK_FLEET_DATA);
  }
}

function writeData(data: MutableFleetData) {
  try {
    const stored: StoredFleetData = { data, version: STORAGE_VERSION };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT));
  } catch {
    throw new ManagementError(
      "storage_unavailable",
      "This browser could not save the demonstration fleet data.",
    );
  }
}

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
  user: FleetUserRecord,
  input: UserAccountInput,
) {
  if (user.role === "driver") {
    ensureUniqueLicense(data, input.licenseNumber ?? "");
    data.driverProfiles.push({
      id: createId("driver-profile"),
      licenseNumber: input.licenseNumber?.trim() ?? "",
      status: "Available",
      userId: user.id,
    });
  } else if (user.role === "mechanic") {
    if (!isRequired(input.specialty ?? "")) {
      throw new ManagementError(
        "invalid_record",
        "Enter a mechanic specialty.",
      );
    }
    data.mechanicProfiles.push({
      id: createId("mechanic-profile"),
      specialty: input.specialty?.trim() ?? "",
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
    !isRequired(input.plate) ||
    !isRequired(input.manufacturer) ||
    !isRequired(input.model) ||
    !isRequired(input.type) ||
    input.year < 1980 ||
    input.year > new Date().getFullYear() + 1 ||
    input.mileage < 0
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
        normalize(vehicle.plate) === normalize(input.plate),
    )
  ) {
    throw new ManagementError(
      "duplicate_plate",
      "That plate number is already in use.",
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
    data.maintenanceRecords.some(
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
  roles: FleetUserRecord["role"][],
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
  const workOrder = data.maintenanceRecords.find(
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
  entityLabel: string,
) {
  data.systemActivity.unshift({
    action,
    entityLabel,
    id: createId("activity"),
    occurredAt: new Date().toISOString(),
    userId: actorUserId,
  });
}

function addNotification(
  data: MutableFleetData,
  notification: Omit<FleetNotification, "createdAt" | "id" | "read">,
) {
  data.notifications.unshift({
    ...notification,
    createdAt: new Date().toISOString(),
    id: createId("notification"),
    read: false,
  });
}

function notificationBelongsToUser(
  notification: FleetNotification,
  user: FleetUserRecord,
) {
  return (
    notification.userId === user.id ||
    (!notification.userId && notification.role === user.role)
  );
}

function requireSharedRole(
  data: MutableFleetData,
  actorUserId: string,
  roles: FleetUserRecord["role"][],
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
  const assignment = data.assignments.find(
    (item) => item.driverProfileId === profile.id && item.status === "Active",
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
  in_progress: ["completed"],
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
  getSnapshot(): FleetDataSource {
    return readData();
  },

  async load(): Promise<FleetDataSource> {
    await delay();
    return readData();
  },

  async createUser(input: UserAccountInput) {
    await delay();
    const data = readData();
    validatePerson(input.fullName, input.email);
    ensureUniqueEmail(data, input.email);
    const user: FleetUserRecord = {
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
    input: Pick<UserAccountInput, "licenseNumber" | "specialty">,
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
    const user: FleetUserRecord = {
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
      driver.licenseNumber = input.licenseNumber?.trim() ?? "";
    }
    const mechanic = data.mechanicProfiles.find(
      (item) => item.userId === userId,
    );
    if (mechanic) {
      if (!isRequired(input.specialty ?? "")) {
        throw new ManagementError(
          "invalid_record",
          "Enter a mechanic specialty.",
        );
      }
      mechanic.specialty = input.specialty?.trim() ?? "";
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
          assignment.driverProfileId === driver.id &&
          assignment.status === "Active",
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
      data.maintenanceRecords.some(
        (record) =>
          record.mechanicProfileId === mechanic.id &&
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
      fleetNumber: input.fleetNumber.trim().toUpperCase(),
      health: 100,
      id: createId("vehicle"),
      manufacturer: input.manufacturer.trim(),
      model: input.model.trim(),
      plate: input.plate.trim().toUpperCase(),
      type: input.type.trim(),
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
    if (
      input.status === "Out of Service" &&
      vehicle.status !== "Out of Service"
    ) {
      ensureVehicleCanBeDeactivated(data, vehicleId);
    }
    Object.assign(vehicle, {
      ...input,
      fleetNumber: input.fleetNumber.trim().toUpperCase(),
      manufacturer: input.manufacturer.trim(),
      model: input.model.trim(),
      plate: input.plate.trim().toUpperCase(),
      type: input.type.trim(),
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

    const driver = getDriverProfile(data, input.driverProfileId);
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
          (assignment.driverProfileId === driver.id ||
            assignment.vehicleId === vehicle.id),
      )
    ) {
      throw new OperationsError(
        "assignment_conflict",
        "The selected driver or vehicle already has an active assignment.",
      );
    }

    const assignment: VehicleAssignment = {
      driverProfileId: driver.id,
      endDate: null,
      id: createId("assignment"),
      startDate: input.startDate,
      status: "Active",
      vehicleId: vehicle.id,
    };
    data.assignments.push(assignment);
    driver.status = "Assigned";
    addNotification(data, {
      destination: "/driver/dashboard",
      message: `${vehicle.fleetNumber} (${vehicle.plate}) is now assigned to you.`,
      role: "driver",
      title: "New vehicle assignment",
      type: "Assignment",
      userId: driverUser.id,
    });
    logActivity(
      data,
      actorUserId,
      "Created vehicle assignment",
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
    const driver = getDriverProfile(data, assignment.driverProfileId);
    if (driver.status !== "Inactive") driver.status = "Available";
    const vehicle = getVehicle(data, assignment.vehicleId);
    logActivity(
      data,
      actorUserId,
      "Ended vehicle assignment",
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
    if (!serviceType.active) {
      throw new OperationsError(
        "invalid_record",
        "Select an active service type.",
      );
    }
    const mechanicProfileId = input.mechanicProfileId || null;
    if (mechanicProfileId) getMechanicProfile(data, mechanicProfileId);
    const schedule: MaintenanceSchedule = {
      createdAt: new Date().toISOString(),
      createdByUserId: actorUserId,
      dueDate: input.dueDate,
      id: createId("schedule"),
      mechanicProfileId,
      notes: input.notes.trim(),
      serviceTypeId: serviceType.id,
      status: input.dueDate < today() ? "Overdue" : "Upcoming",
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
          (profile) => profile.id === activeAssignment.driverProfileId,
        )
      : undefined;
    if (assignedDriver) {
      addNotification(data, {
        destination: "/driver/maintenance",
        message: `${serviceType.name} for ${vehicle.fleetNumber} is scheduled for ${input.dueDate}.`,
        role: "driver",
        title: "Upcoming maintenance reminder",
        type: "Reminder",
        userId: assignedDriver.userId,
      });
    }
    if (mechanicProfileId) {
      const mechanic = getMechanicProfile(data, mechanicProfileId);
      addNotification(data, {
        destination: "/mechanic/dashboard",
        message: `${serviceType.name} for ${vehicle.fleetNumber} is planned for ${input.dueDate}.`,
        role: "mechanic",
        title: "Maintenance schedule assigned",
        type: "Schedule",
        userId: mechanic.userId,
      });
    }
    logActivity(
      data,
      actorUserId,
      "Created maintenance schedule",
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
    if (!serviceType.active && !input.scheduleId) {
      throw new OperationsError(
        "invalid_record",
        "Select an active service type.",
      );
    }
    const mechanicProfileId = input.mechanicProfileId || null;
    if (mechanicProfileId) getMechanicProfile(data, mechanicProfileId);

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

    const workOrder: MaintenanceRecord = {
      completedDate: null,
      createdAt: new Date().toISOString(),
      createdByUserId: actorUserId,
      id: createId("work-order"),
      mechanicProfileId,
      notes: input.notes.trim(),
      priority: input.priority,
      scheduleId: schedule?.id ?? null,
      scheduledDate: input.scheduledDate,
      serviceNotes: "",
      serviceTypeId: serviceType.id,
      status: mechanicProfileId ? "assigned" : "scheduled",
      vehicleId: vehicle.id,
    };
    data.maintenanceRecords.push(workOrder);
    if (schedule) {
      schedule.status = "Converted";
      schedule.workOrderId = workOrder.id;
    }
    logActivity(
      data,
      actorUserId,
      "Created maintenance work order",
      `${vehicle.fleetNumber} ${serviceType.name}`,
    );
    writeData(data);
    return workOrder;
  },

  async assignWorkOrder(
    workOrderId: string,
    mechanicProfileId: string,
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
    const mechanic = getMechanicProfile(data, mechanicProfileId);
    workOrder.mechanicProfileId = mechanic.id;
    workOrder.status = "assigned";
    const assignedVehicle = getVehicle(data, workOrder.vehicleId);
    const assignedService = getServiceType(data, workOrder.serviceTypeId);
    addNotification(data, {
      destination: "/maintenance/work-orders",
      message: `${assignedService.name} for ${assignedVehicle.fleetNumber} is assigned to you.`,
      role: "mechanic",
      title: "Work order assigned",
      type: "Maintenance",
      userId: mechanic.userId,
    });
    logActivity(
      data,
      actorUserId,
      "Assigned maintenance work order",
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
      if (!mechanic || workOrder.mechanicProfileId !== mechanic.id) {
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
    validateWorkOrderTransition(workOrder.status, input.status);
    if (input.status === "in_progress" && !workOrder.mechanicProfileId) {
      throw new OperationsError(
        "invalid_transition",
        "Assign a mechanic before starting this work order.",
      );
    }
    if (input.status === "completed" && !isRequired(input.serviceNotes ?? "")) {
      throw new OperationsError(
        "invalid_record",
        "Add service notes before completing this work order.",
      );
    }
    if (input.serviceNotes !== undefined) {
      workOrder.serviceNotes = input.serviceNotes.trim();
    }
    workOrder.status = input.status;
    const vehicle = getVehicle(data, workOrder.vehicleId);
    if (input.status === "in_progress") vehicle.status = "Maintenance";
    if (input.status === "completed") {
      workOrder.completedDate = today();
      const hasOtherActiveWork = data.maintenanceRecords.some(
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
            (profile) => profile.id === activeAssignment.driverProfileId,
          )
        : undefined;
      const serviceType = getServiceType(data, workOrder.serviceTypeId);
      if (driver) {
        addNotification(data, {
          destination: "/maintenance/history",
          message: `${serviceType.name} for ${vehicle.fleetNumber} was completed.`,
          role: "driver",
          title: "Vehicle maintenance completed",
          type: "Maintenance",
          userId: driver.userId,
        });
      }
    }
    logActivity(
      data,
      input.actorUserId,
      `Updated work order to ${input.status.replace("_", " ")}`,
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
      "manager",
      "mechanic",
    ]);
    const workOrder = getWorkOrder(data, workOrderId);
    if (actor.role === "mechanic") {
      const mechanic = data.mechanicProfiles.find(
        (profile) => profile.userId === actor.id,
      );
      if (!mechanic || workOrder.mechanicProfileId !== mechanic.id) {
        throw new OperationsError(
          "unauthorized",
          "Mechanics can add notes only to their assigned work.",
        );
      }
    }
    if (workOrder.status === "cancelled") {
      throw new OperationsError(
        "invalid_record",
        "Cancelled work orders cannot be edited.",
      );
    }
    workOrder.serviceNotes = serviceNotes.trim();
    writeData(data);
    return workOrder;
  },

  async createServiceType(input: ServiceTypeInput, actorUserId: string) {
    await delay();
    const data = readData();
    requireOperationsRole(data, actorUserId, ["admin"]);
    if (!isRequired(input.name) || !isRequired(input.description)) {
      throw new OperationsError(
        "invalid_record",
        "Enter a service type name and description.",
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
      active: true,
      description: input.description.trim(),
      id: createId("service-type"),
      name: input.name.trim(),
    };
    data.serviceTypes.push(serviceType);
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
    if (!isRequired(input.name) || !isRequired(input.description)) {
      throw new OperationsError(
        "invalid_record",
        "Enter a service type name and description.",
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
    writeData(data);
    return serviceType;
  },

  async deactivateServiceType(serviceTypeId: string, actorUserId: string) {
    await delay();
    const data = readData();
    requireOperationsRole(data, actorUserId, ["admin"]);
    const serviceType = getServiceType(data, serviceTypeId);
    serviceType.active = false;
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
    const previousEntries = data.mileageSubmissions.filter(
      (entry) =>
        entry.driverProfileId === profile.id && entry.vehicleId === vehicle.id,
    );
    const latestSubmissionDate = previousEntries
      .map((entry) => entry.submittedAt.slice(0, 10))
      .sort()
      .at(-1);
    if (latestSubmissionDate && input.submissionDate < latestSubmissionDate) {
      throw new SharedFeatureError(
        "invalid_date",
        `The submission date cannot be earlier than ${latestSubmissionDate}.`,
      );
    }
    const currentOdometer = Math.max(
      vehicle.mileage,
      ...previousEntries.map((entry) => entry.mileage),
    );
    if (!Number.isFinite(input.mileage) || input.mileage < currentOdometer) {
      throw new SharedFeatureError(
        "invalid_mileage",
        `The odometer reading cannot be lower than ${currentOdometer.toLocaleString()} km.`,
      );
    }
    const submission: MileageSubmission = {
      driverProfileId: profile.id,
      id: createId("mileage"),
      mileage: input.mileage,
      notes: input.notes.trim(),
      submittedAt: `${input.submissionDate}T12:00:00.000Z`,
      vehicleId: vehicle.id,
    };
    data.mileageSubmissions.push(submission);
    vehicle.mileage = input.mileage;
    addNotification(data, {
      destination: "/driver/mileage",
      message: `${input.mileage.toLocaleString()} km was recorded for ${vehicle.fleetNumber}.`,
      role: "driver",
      title: "Mileage submission recorded",
      type: "Mileage",
      userId: actorUserId,
    });
    logActivity(
      data,
      actorUserId,
      "Submitted mileage",
      `${vehicle.fleetNumber} · ${input.mileage.toLocaleString()} km`,
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
    notification.read = true;
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
      notification.read = true;
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
    logActivity(data, actor.id, "Updated profile", actor.fullName);
    writeData(data);
    return actor;
  },

  resetForTests() {
    window.localStorage.removeItem(STORAGE_KEY);
  },
};

export const FLEET_DATA_STORAGE_KEY = STORAGE_KEY;
export const FLEET_DATA_CHANGED_EVENT = DATA_CHANGED_EVENT;
