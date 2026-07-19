(function () {
  "use strict";
  let data;
  const source = () => data || (data = ForgeFleetStorage.load());
  const save = () => ForgeFleetStorage.save(data);
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const nextId = (prefix, list) =>
    prefix +
    "-" +
    String(
      Math.max(0, ...list.map((x) => Number((x.id || "").split("-")[1]) || 0)) +
        1,
    ).padStart(3, "0");
  function list(name) {
    return clone(source()[name] || []);
  }
  function find(name, id) {
    return source()[name].find((x) => x.id === id);
  }
  function upsert(collection, record, prefix) {
    const records = source()[collection],
      copy = { ...record };
    if (copy.id) {
      const index = records.findIndex((x) => x.id === copy.id);
      if (index < 0) throw new Error("Record not found.");
      records[index] = { ...records[index], ...copy };
    } else {
      copy.id = nextId(prefix, records);
      records.push(copy);
    }
    save();
    return clone(copy);
  }
  function remove(collection, id) {
    const records = source()[collection],
      index = records.findIndex((x) => x.id === id);
    if (index < 0) throw new Error("Record not found.");
    records.splice(index, 1);
    save();
  }
  const api = {
    getAll: list,
    getUsers() {
      return list("users").map(({ password, ...user }) => user);
    },
    getUserById: (id) => clone(find("users", id)),
    getVehicles: () => list("vehicles"),
    getVehicleById: (id) => clone(find("vehicles", id)),
    getDrivers: () => list("drivers"),
    getMechanics: () => list("mechanics"),
    getAssignments: () => list("assignments"),
    getMaintenanceSchedules: () => list("schedules"),
    getMaintenanceRecords: () => list("maintenance"),
    getMileageLogs: () => list("mileageLogs"),
    getAuditLogs: () => list("auditLogs"),
    getServiceTypes: () => list("serviceTypes"),
    getNotifications(user) {
      return list("notifications").filter(
        (n) =>
          !user || n.userId === user.id || (!n.userId && n.role === user.role),
      );
    },
    authenticate(email, password) {
      const user = source().users.find(
        (u) =>
          u.email.toLowerCase() === String(email).trim().toLowerCase() &&
          u.password === password,
      );
      if (!user) return { user: null, reason: "invalid" };
      if (user.status !== "Active") return { user: null, reason: "inactive" };
      user.lastLogin = new Date().toISOString();
      save();
      return { user: clone(user), reason: null };
    },
    emailExists(email) {
      return source().users.some(
        (u) => u.email.toLowerCase() === String(email).trim().toLowerCase(),
      );
    },
    registerAccount(record) {
      const email = String(record.email).trim().toLowerCase();
      if (api.emailExists(email))
        throw new Error("That email is already registered.");
      const user = {
        id: nextId("USR", source().users),
        name: String(record.name).trim(),
        email,
        phone: String(record.phone).trim(),
        password: record.password,
        role: record.role,
        status: "Active",
        createdDate: new Date().toISOString(),
        lastLogin: null,
        initials: String(record.name)
          .trim()
          .split(/\s+/)
          .map((x) => x[0])
          .slice(0, 2)
          .join("")
          .toUpperCase(),
        profile: clone(record.profile || {}),
      };
      source().users.push(user);
      if (user.role === "driver")
        source().drivers.push({
          id: record.profile.employeeId || nextId("DRV", source().drivers),
          userId: user.id,
          name: user.name,
          license: record.profile.license,
          licenseExpiration: record.profile.licenseExpiration,
          phone: user.phone,
          depot: record.profile.depot,
          status: "Available",
        });
      if (user.role === "mechanic")
        source().mechanics.push({
          id: record.profile.employeeId || nextId("MEC", source().mechanics),
          userId: user.id,
          name: user.name,
          specialty: record.profile.specialization,
          certification: record.profile.certification,
          depot: record.profile.depot,
          status: "Active",
        });
      save();
      return clone(user);
    },
    upsert,
    remove,
    createUser: (r) => upsert("users", r, "USR"),
    updateUser: (r) => upsert("users", r, "USR"),
    deleteUser(id, activeId) {
      if (id === activeId)
        throw new Error("You cannot delete the signed-in account.");
      const user = find("users", id);
      if (
        user?.role === "admin" &&
        user.status === "Active" &&
        source().users.filter(
          (x) => x.role === "admin" && x.status === "Active",
        ).length <= 1
      )
        throw new Error("The last active Admin account cannot be deleted.");
      remove("users", id);
    },
    createVehicle: (r) => upsert("vehicles", r, "VEH"),
    updateVehicle: (r) => upsert("vehicles", r, "VEH"),
    deleteVehicle: (id) => remove("vehicles", id),
    createDriver: (r) => upsert("drivers", r, "DRV"),
    updateDriver: (r) => upsert("drivers", r, "DRV"),
    deleteDriver: (id) => remove("drivers", id),
    createServiceType: (r) => upsert("serviceTypes", r, "SVC"),
    updateServiceType: (r) => upsert("serviceTypes", r, "SVC"),
    deleteServiceType(id) {
      if (
        source().maintenance.some((x) => x.serviceTypeId === id) ||
        source().schedules.some((x) => x.serviceTypeId === id)
      )
        throw new Error(
          "This service type is referenced by maintenance records.",
        );
      remove("serviceTypes", id);
    },
    createMaintenanceRecord: (r) => upsert("maintenance", r, "MNT"),
    updateMaintenanceRecord(r) {
      const updated = upsert("maintenance", r, "MNT");
      const vehicle = find("vehicles", r.vehicleId);
      if (vehicle)
        vehicle.status = r.status === "Completed" ? "Active" : "Maintenance";
      save();
      return updated;
    },
    deleteMaintenanceRecord: (id) => remove("maintenance", id),
    createSchedule: (r) => upsert("schedules", r, "SCH"),
    updateSchedule: (r) => upsert("schedules", r, "SCH"),
    deleteSchedule: (id) => remove("schedules", id),
    createMileageLog(record) {
      const vehicle = find("vehicles", record.vehicleId);
      if (!vehicle) throw new Error("Vehicle not found.");
      const mileage = Number(record.mileage);
      const latest = Math.max(
        vehicle.mileage || 0,
        ...source()
          .mileageLogs.filter((x) => x.vehicleId === record.vehicleId)
          .map((x) => Number(x.mileage) || 0),
      );
      if (mileage < latest)
        throw new Error(
          `Mileage cannot be lower than ${latest.toLocaleString()}.`,
        );
      if (
        source().mileageLogs.some(
          (x) => x.vehicleId === record.vehicleId && x.date === record.date,
        )
      )
        throw new Error("A mileage entry already exists for this date.");
      const created = upsert("mileageLogs", { ...record, mileage }, "MLG");
      vehicle.mileage = mileage;
      save();
      return created;
    },
    createAssignment(record) {
      const active = source().assignments.filter(
        (a) => a.status === "Active" && a.id !== record.id,
      );
      if (active.some((a) => a.driverId === record.driverId))
        throw new Error("This driver already has an active vehicle.");
      if (active.some((a) => a.vehicleId === record.vehicleId))
        throw new Error("This vehicle already has an active driver.");
      const result = upsert("assignments", record, "ASN"),
        vehicle = find("vehicles", record.vehicleId),
        driver = find("drivers", record.driverId);
      if (vehicle) {
        vehicle.driverId = record.driverId;
      }
      if (driver) driver.status = "Assigned";
      save();
      return result;
    },
    updateAssignment: (r) => api.createAssignment(r),
    endAssignment(id) {
      const assignment = find("assignments", id);
      if (!assignment) throw new Error("Assignment not found.");
      assignment.status = "Ended";
      assignment.endDate = new Date().toISOString().slice(0, 10);
      const vehicle = find("vehicles", assignment.vehicleId),
        driver = find("drivers", assignment.driverId);
      if (vehicle) vehicle.driverId = null;
      if (driver) driver.status = "Available";
      save();
      return clone(assignment);
    },
    markNotificationAsRead(id) {
      const notification = find("notifications", id);
      if (notification) notification.read = true;
      save();
    },
    markAllNotificationsAsRead(user) {
      api.getNotifications(user).forEach((n) => {
        const item = find("notifications", n.id);
        if (item) item.read = true;
      });
      save();
    },
    updateProfile(id, patch) {
      const user = find("users", id);
      Object.assign(user, patch);
      user.initials = user.name
        .split(/\s+/)
        .map((x) => x[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
      save();
      return clone(user);
    },
    changePassword(id, current, next) {
      const user = find("users", id);
      if (!user || user.password !== current)
        throw new Error("Current demo password is incorrect.");
      user.password = next;
      save();
    },
    resetDemoData() {
      data = ForgeFleetStorage.reset();
      return clone(data);
    },
  };
  window.ForgeFleetData = api;
})();
