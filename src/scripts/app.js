(function () {
  "use strict";
  const V = () => window.ForgeFleetValidation.escape;
  const D = () => window.ForgeFleetData;
  const session = () => window.ForgeFleetAuth.get();
  const labels = {
    users: "Users",
    vehicles: "Vehicles",
    drivers: "Drivers",
    "service-types": "Service Types",
    maintenance: "Maintenance",
    assignments: "Assignments",
    schedules: "Maintenance Schedules",
    "service-history": "Service History",
    audit: "Audit Logs",
    mileage: "Mileage Logs",
    "maintenance-reminders": "Maintenance Reminders",
    notifications: "Notifications",
    reports: "Reports",
    profile: "Profile",
    search: "Search",
  };
  const configs = {
    users: {
      collection: "users",
      get: "getUsers",
      prefix: "USR",
      fields: [
        ["name", "Name", "text"],
        ["email", "Email", "email"],
        ["role", "Role", "select:admin|manager|mechanic|driver"],
        ["phone", "Phone", "tel"],
        ["status", "Status", "select:Active|Inactive"],
      ],
      columns: [
        ["name", "Name"],
        ["email", "Email"],
        ["role", "Role"],
        ["status", "Status"],
      ],
    },
    vehicles: {
      collection: "vehicles",
      get: "getVehicles",
      prefix: "VEH",
      fields: [
        ["plate", "Plate number", "text"],
        ["model", "Model", "text"],
        ["manufacturer", "Manufacturer", "text"],
        ["year", "Year", "number"],
        ["type", "Vehicle type", "text"],
        ["mileage", "Current mileage", "number"],
        [
          "status",
          "Status",
          "select:Active|Maintenance|Inspection|Out of Service",
        ],
      ],
      columns: [
        ["plate", "Plate"],
        ["model", "Vehicle"],
        ["type", "Type"],
        ["mileage", "Mileage"],
        ["status", "Status"],
      ],
    },
    drivers: {
      collection: "drivers",
      get: "getDrivers",
      prefix: "DRV",
      fields: [
        ["name", "Name", "text"],
        ["license", "License number", "text"],
        ["phone", "Phone", "tel"],
        ["status", "Status", "select:Available|Assigned|Inactive"],
      ],
      columns: [
        ["name", "Driver"],
        ["license", "License"],
        ["phone", "Phone"],
        ["status", "Status"],
      ],
    },
    "service-types": {
      collection: "serviceTypes",
      get: "getServiceTypes",
      prefix: "SVC",
      fields: [
        ["name", "Service name", "text"],
        ["intervalKm", "Interval (km)", "number"],
        ["status", "Status", "select:Active|Inactive"],
      ],
      columns: [
        ["name", "Service"],
        ["intervalKm", "Interval (km)"],
        ["status", "Status"],
      ],
    },
    maintenance: {
      collection: "maintenance",
      get: "getMaintenanceRecords",
      prefix: "MNT",
      fields: [
        ["vehicleId", "Vehicle", "vehicle"],
        ["serviceTypeId", "Service type", "service"],
        ["mechanicId", "Mechanic", "mechanic"],
        ["serviceDate", "Service date", "date"],
        ["status", "Status", "select:Pending|In Progress|Completed"],
        ["cost", "Cost", "number"],
        ["findings", "Findings", "textarea"],
        ["workPerformed", "Work performed", "textarea"],
        ["notes", "Notes", "textarea"],
      ],
      columns: [
        ["vehicleId", "Vehicle"],
        ["serviceTypeId", "Service"],
        ["serviceDate", "Date"],
        ["cost", "Cost"],
        ["status", "Status"],
      ],
    },
    "service-history": {
      collection: "maintenance",
      get: "getMaintenanceRecords",
      readonly: true,
      columns: [
        ["vehicleId", "Vehicle"],
        ["serviceTypeId", "Service"],
        ["serviceDate", "Date"],
        ["completionDate", "Completed"],
        ["cost", "Cost"],
        ["status", "Status"],
      ],
    },
    assignments: {
      collection: "assignments",
      get: "getAssignments",
      prefix: "ASN",
      fields: [
        ["vehicleId", "Vehicle", "vehicle"],
        ["driverId", "Driver", "driver"],
        ["startDate", "Start date", "date"],
        ["status", "Status", "select:Active|Ended"],
      ],
      columns: [
        ["vehicleId", "Vehicle"],
        ["driverId", "Driver"],
        ["startDate", "Started"],
        ["endDate", "Ended"],
        ["status", "Status"],
      ],
    },
    schedules: {
      collection: "schedules",
      get: "getMaintenanceSchedules",
      prefix: "SCH",
      fields: [
        ["vehicleId", "Vehicle", "vehicle"],
        ["serviceTypeId", "Service", "service"],
        ["dueDate", "Due date", "date"],
        ["status", "Status", "select:Upcoming|Overdue|Completed"],
      ],
      columns: [
        ["vehicleId", "Vehicle"],
        ["serviceTypeId", "Service"],
        ["dueDate", "Due"],
        ["status", "Status"],
      ],
    },
    mileage: {
      collection: "mileageLogs",
      get: "getMileageLogs",
      prefix: "MLG",
      fields: [
        ["vehicleId", "Vehicle", "vehicle"],
        ["date", "Date", "date"],
        ["mileage", "Odometer reading", "number"],
        ["notes", "Route or notes", "text"],
      ],
      columns: [
        ["vehicleId", "Vehicle"],
        ["date", "Date"],
        ["mileage", "Mileage"],
        ["notes", "Notes"],
      ],
    },
    audit: {
      collection: "auditLogs",
      get: "getAuditLogs",
      readonly: true,
      columns: [
        ["date", "Date"],
        ["userId", "User"],
        ["action", "Action"],
        ["entity", "Record"],
      ],
    },
  };

  const deleteActions = {
    users: (id) => D().deleteUser(id, session().id),
    vehicles: (id) => D().deleteVehicle(id),
    drivers: (id) => D().deleteDriver(id),
    serviceTypes: (id) => D().deleteServiceType(id),
    maintenance: (id) => D().deleteMaintenanceRecord(id),
    schedules: (id) => D().deleteSchedule(id),
  };
  let state = { page: 1, search: "", status: "all", sort: "", dir: 1 };
  const statusClass = (s) => {
    s = String(s).toLowerCase();
    return s.includes("active") ||
      s.includes("complete") ||
      s.includes("available")
      ? "success"
      : s.includes("overdue") || s.includes("out of")
        ? "danger"
        : s.includes("progress") ||
            s.includes("maintenance") ||
            s.includes("inspection") ||
            s.includes("pending")
          ? "warning"
          : "info";
  };
  function resolve(key, val) {
    if (val == null || val === "") return "—";
    const maps = {
      vehicleId: D().getVehicles(),
      driverId: D().getDrivers(),
      mechanicId: D().getMechanics(),
      serviceTypeId: D().getServiceTypes(),
      userId: D().getUsers(),
    };
    const list = maps[key];
    if (list) {
      const x = list.find((i) => i.id === val);
      return x ? x.plate || x.name : val;
    }
    if (key === "mileage") return Number(val).toLocaleString() + " km";
    if (key === "cost") return "$" + Number(val).toLocaleString();
    return val;
  }
  function badge(v) {
    return `<span class="badge badge-${statusClass(v)}">${V()(v)}</span>`;
  }
  function head(title, desc, action = "") {
    return `<header class="page-head"><div><p class="eyebrow">ForgeFleet Control</p><h1>${V()(title)}</h1><p>${V()(desc)}</p></div><div class="page-actions">${action}</div></header>`;
  }
  function metrics(items) {
    return `<div class="content-grid metrics-grid mb-4">${items.map((x) => `<article class="card metric-card"><span class="metric-icon">${x.icon || "◇"}</span><span class="metric-value">${V()(x.value)}</span><strong>${V()(x.label)}</strong><p class="muted">${V()(x.note || "Live demo calculation")}</p></article>`).join("")}</div>`;
  }
  function dashboard(role) {
    const vehicles = D().getVehicles(),
      maint = D().getMaintenanceRecords(),
      users = D().getUsers(),
      drivers = D().getDrivers(),
      assign = D().getAssignments(),
      sched = D().getMaintenanceSchedules();
    const roleMetrics =
      role === "mechanic"
        ? [
            [
              "Assigned tasks",
              maint.filter((x) => x.mechanicId === "MEC-001").length,
            ],
            ["Pending", maint.filter((x) => x.status === "Pending").length],
            [
              "In progress",
              maint.filter((x) => x.status === "In Progress").length,
            ],
            ["Completed", maint.filter((x) => x.status === "Completed").length],
          ]
        : role === "driver"
          ? [
              [
                "Assigned vehicle",
                vehicles.filter((x) => x.driverId === "DRV-001").length,
              ],
              [
                "Current mileage",
                vehicles
                  .find((x) => x.driverId === "DRV-001")
                  ?.mileage.toLocaleString() + " km",
              ],
              [
                "Upcoming service",
                sched.filter(
                  (x) => x.vehicleId === "VEH-001" && x.status === "Upcoming",
                ).length,
              ],
              [
                "Unread alerts",
                D()
                  .getNotifications(session())
                  .filter((x) => !x.read).length,
              ],
            ]
          : role === "manager"
            ? [
                ["Fleet vehicles", vehicles.length],
                [
                  "Available drivers",
                  drivers.filter((x) => x.status === "Available").length,
                ],
                [
                  "Active assignments",
                  assign.filter((x) => x.status === "Active").length,
                ],
                [
                  "Overdue schedules",
                  sched.filter((x) => x.status === "Overdue").length,
                ],
              ]
            : [
                ["Total vehicles", vehicles.length],
                [
                  "Active vehicles",
                  vehicles.filter((x) => x.status === "Active").length,
                ],
                [
                  "Under maintenance",
                  vehicles.filter((x) => x.status !== "Active").length,
                ],
                ["Total users", users.length],
              ];
    return (
      head(
        role[0].toUpperCase() + role.slice(1) + " Dashboard",
        "Fleet readiness, maintenance visibility, and operational activity.",
      ) +
      metrics(
        roleMetrics.map((x, i) => ({
          label: x[0],
          value: x[1],
          icon: ["◇", "▣", "⚒", "◎"][i],
        })),
      ) +
      `<div class="content-grid two-column"><section class="card"><div class="card-head"><div><p class="eyebrow">Fleet health</p><h2>Vehicle readiness</h2></div></div><div class="chart" aria-label="Vehicle health bar chart">${vehicles.map((v) => `<div class="chart-bar" style="height:${v.health}%"><span>${V()(v.plate)}</span></div>`).join("")}</div></section><section class="card"><div class="card-head"><div><p class="eyebrow">Status</p><h2>Fleet distribution</h2></div></div><div class="donut" role="img" aria-label="Fleet status distribution"></div></section><section class="card"><div class="card-head"><h2>Recent maintenance</h2><a class="button button-ghost" href="maintenance.html">View all</a></div>${simpleList(maint.slice(0, 3).map((x) => [resolve("vehicleId", x.vehicleId), resolve("serviceTypeId", x.serviceTypeId), x.status]))}</section><section class="card"><div class="card-head"><h2>Notifications</h2></div>${simpleList(
        D()
          .getNotifications(session())
          .slice(0, 4)
          .map((x) => [x.title, x.message, x.read ? "Read" : "Unread"]),
      )}</section></div>`
    );
  }
  function simpleList(items) {
    return `<div class="list">${items.map((x) => `<div class="list-item"><div><strong>${V()(x[0])}</strong><p class="muted">${V()(x[1])}</p></div>${badge(x[2])}</div>`).join("") || '<div class="empty-state"><strong>No records</strong>Nothing to display.</div>'}</div>`;
  }
  function options(type, current) {
    let list = [];
    if (type === "vehicle")
      list = D()
        .getVehicles()
        .map((x) => [x.id, x.plate + " — " + x.model]);
    if (type === "driver")
      list = D()
        .getDrivers()
        .map((x) => [x.id, x.name]);
    if (type === "mechanic")
      list = D()
        .getMechanics()
        .map((x) => [x.id, x.name]);
    if (type === "service")
      list = D()
        .getServiceTypes()
        .map((x) => [x.id, x.name]);
    if (type.startsWith("select:"))
      list = type
        .slice(7)
        .split("|")
        .map((x) => [x, x]);
    return list
      .map(
        ([v, l]) =>
          `<option value="${V()(v)}" ${v === current ? "selected" : ""}>${V()(l)}</option>`,
      )
      .join("");
  }
  function formHtml(cfg, row = {}) {
    return `<form id="record-form" class="form-grid" novalidate><input type="hidden" name="id" value="${V()(row.id || "")}">${cfg.fields.map(([key, label, type]) => `<div class="field ${type === "textarea" ? "field-wide" : ""}"><label for="field-${key}">${V()(label)}</label>${type === "textarea" ? `<textarea id="field-${key}" name="${key}">${V()(row[key] || "")}</textarea>` : type.startsWith("select:") || ["vehicle", "driver", "mechanic", "service"].includes(type) ? `<select id="field-${key}" name="${key}"><option value="">Select ${V()(label.toLowerCase())}</option>${options(type, row[key])}</select>` : `<input id="field-${key}" name="${key}" type="${type}" value="${V()(row[key] ?? "")}" ${type === "number" ? 'min="0"' : ""}>`}<span class="field-error" data-error-for="${key}"></span></div>`).join("")}</form>`;
  }
  function openForm(cfg, row) {
    ForgeFleetModal.open({
      title: (row ? "Edit " : "Add ") + labels[document.body.dataset.page],
      body: formHtml(cfg, row),
      actions:
        '<button class="button button-ghost" data-modal-close type="button">Cancel</button><button class="button button-primary" id="save-record" type="button">Save record</button>',
      onReady() {
        document
          .getElementById("save-record")
          .addEventListener("click", () => saveForm(cfg));
      },
    });
  }
  function saveForm(cfg) {
    const form = document.getElementById("record-form"),
      raw = Object.fromEntries(new FormData(form));
    let ok = true;
    cfg.fields.forEach(([key]) => {
      const err = form.querySelector(`[data-error-for="${key}"]`);
      if (!String(raw[key] ?? "").trim()) {
        err.textContent = "This field is required.";
        ok = false;
      } else err.textContent = "";
    });
    if (!ok) return;
    cfg.fields
      .filter((x) => x[2] === "number")
      .forEach(([k]) => (raw[k] = Number(raw[k])));
    try {
      if (cfg.collection === "assignments")
        raw.id ? D().updateAssignment(raw) : D().createAssignment(raw);
      else if (cfg.collection === "mileageLogs" && !raw.id)
        D().createMileageLog(raw);
      else D().upsert(cfg.collection, raw, cfg.prefix);
      ForgeFleetModal.close();
      ForgeFleetToast("Demo record saved.");
      render();
    } catch (e) {
      ForgeFleetToast(e.message, "error");
    }
  }
  function management(page) {
    const cfg = configs[page],
      all = D()[cfg.get]();
    let rows = all.filter(
      (r) =>
        JSON.stringify(r).toLowerCase().includes(state.search.toLowerCase()) &&
        (state.status === "all" || r.status === state.status),
    );
    if (state.sort)
      rows.sort(
        (a, b) =>
          String(a[state.sort] ?? "").localeCompare(
            String(b[state.sort] ?? ""),
            undefined,
            { numeric: true },
          ) * state.dir,
      );
    const size = 6,
      pages = Math.max(1, Math.ceil(rows.length / size));
    state.page = Math.min(state.page, pages);
    const view = rows.slice((state.page - 1) * size, state.page * size),
      statuses = [...new Set(all.map((x) => x.status).filter(Boolean))];
    return (
      head(
        labels[page],
        `Manage and review ${labels[page].toLowerCase()} using frontend demo data.`,
        cfg.readonly
          ? ""
          : `<button class="button button-primary" data-add type="button">Add record</button>`,
      ) +
      `<section class="card"><div class="toolbar"><div class="field"><label for="table-search">Search</label><input id="table-search" type="search" value="${V()(state.search)}" placeholder="Search records"></div>${statuses.length ? `<div class="field"><label for="status-filter">Status</label><select id="status-filter"><option value="all">All statuses</option>${statuses.map((x) => `<option ${state.status === x ? "selected" : ""}>${V()(x)}</option>`).join("")}</select></div>` : ""}</div><div class="table-wrap"><table class="data-table"><thead><tr>${cfg.columns.map(([k, l]) => `<th><button class="button button-ghost" data-sort="${k}" type="button">${V()(l)}</button></th>`).join("")}${cfg.readonly ? "" : "<th>Actions</th>"}</tr></thead><tbody>${view.map((r) => `<tr>${cfg.columns.map(([k]) => `<td>${k === "status" ? badge(r[k]) : V()(resolve(k, r[k]))}</td>`).join("")}${cfg.readonly ? "" : `<td><div class="table-actions"><button class="button" data-edit="${r.id}" type="button">Edit</button>${page === "assignments" && r.status === "Active" ? `<button class="button" data-end="${r.id}" type="button">End</button>` : `<button class="button button-danger" data-delete="${r.id}" type="button">Delete</button>`}</div></td>`}</tr>`).join("")}</tbody></table>${view.length ? "" : '<div class="empty-state"><strong>No matching records</strong>Adjust the search or filter.</div>'}</div><div class="pagination"><span class="muted">${rows.length} records · Page ${state.page} of ${pages}</span><div class="pagination-buttons"><button class="button" data-page-prev ${state.page === 1 ? "disabled" : ""}>Previous</button><button class="button" data-page-next ${state.page === pages ? "disabled" : ""}>Next</button></div></div></section>`
    );
  }
  function reports() {
    const m = D().getMaintenanceRecords(),
      vehicles = D().getVehicles(),
      cost = m.reduce((n, x) => n + Number(x.cost || 0), 0);
    return (
      head(
        "Reports",
        "Mock-data analytics with safe frontend CSV export.",
        '<button class="button button-primary" id="export-csv">Export visible CSV</button>',
      ) +
      metrics([
        { label: "Maintenance cost", value: "$" + cost.toLocaleString() },
        {
          label: "Completed services",
          value: m.filter((x) => x.status === "Completed").length,
        },
        {
          label: "Overdue schedules",
          value: D()
            .getMaintenanceSchedules()
            .filter((x) => x.status === "Overdue").length,
        },
        { label: "Fleet vehicles", value: vehicles.length },
      ]) +
      `<div class="content-grid two-column"><section class="card"><h2>Maintenance cost by record</h2><div class="chart">${m.map((x) => `<div class="chart-bar" style="height:${Math.max(10, Number(x.cost) / 15)}px"><span>${V()(x.id)}</span></div>`).join("")}</div></section><section class="card"><h2>Vehicle status</h2><div class="donut"></div></section></div>`
    );
  }
  function notifications() {
    const notes = D().getNotifications(session());
    return (
      head(
        "Notifications",
        "Review demo alerts and update their local read state.",
        '<button class="button button-primary" id="mark-all">Mark all as read</button>',
      ) +
      `<section class="card">${simpleList(notes.map((x) => [x.title, x.message, x.read ? "Read" : "Unread"]).map((x, i) => x))}<div class="mt-4 cluster">${notes
        .filter((x) => !x.read)
        .map(
          (x) =>
            `<button class="button" data-read="${x.id}">Mark “${V()(x.title)}” read</button>`,
        )
        .join("")}</div></section>`
    );
  }
  function profile() {
    const u = D().getUserById(session().id);
    return (
      head(
        "Profile",
        "Update allowed demo profile fields stored in this browser.",
      ) +
      `<section class="card"><form id="profile-form" class="form-grid" novalidate><div class="field"><label for="profile-name">Name</label><input id="profile-name" name="name" value="${V()(u.name)}"><span class="field-error" data-p-error="name"></span></div><div class="field"><label for="profile-email">Email</label><input id="profile-email" name="email" type="email" value="${V()(u.email)}"><span class="field-error" data-p-error="email"></span></div><div class="field"><label for="profile-phone">Phone</label><input id="profile-phone" name="phone" value="${V()(u.phone || "")}"><span class="field-error" data-p-error="phone"></span></div><div class="field"><label for="profile-role">Role</label><input id="profile-role" value="${V()(u.role)}" disabled></div><div class="field-wide"><button class="button button-primary" type="submit">Save profile</button></div></form></section>`
    );
  }
  function assignedVehicle() {
    const driver = D()
        .getDrivers()
        .find((x) => x.userId === session().id),
      v = D()
        .getVehicles()
        .find((x) => x.driverId === driver?.id),
      a = D()
        .getAssignments()
        .find((x) => x.driverId === driver?.id && x.status === "Active");
    return (
      head("Assigned Vehicle", "Current vehicle and assignment information.") +
      (v
        ? metrics([
            { label: "Plate", value: v.plate },
            { label: "Model", value: v.model },
            { label: "Mileage", value: v.mileage.toLocaleString() + " km" },
            { label: "Status", value: v.status },
          ]) +
          `<section class="card"><div class="form-grid"><p><strong>Manufacturer</strong><br><span class="muted">${V()(v.manufacturer)}</span></p><p><strong>Year</strong><br><span class="muted">${v.year}</span></p><p><strong>Vehicle type</strong><br><span class="muted">${V()(v.type)}</span></p><p><strong>Assignment date</strong><br><span class="muted">${V()(a?.startDate || "Not available")}</span></p></div></section>`
        : '<div class="card empty-state"><strong>No assigned vehicle</strong>Contact your fleet manager.</div>')
    );
  }
  function reminders() {
    const schedules = D().getMaintenanceSchedules();
    return (
      head(
        "Maintenance Reminders",
        "Upcoming, overdue, and completed service commitments.",
      ) +
      `<section class="card">${simpleList(schedules.map((x) => [resolve("vehicleId", x.vehicleId), resolve("serviceTypeId", x.serviceTypeId) + " · " + x.dueDate, x.status]))}</section>`
    );
  }
  function search() {
    const q = new URLSearchParams(location.search).get("q") || "";
    const groups = [
      ["Vehicles", D().getVehicles(), ["plate", "model", "manufacturer"]],
      ["Drivers", D().getDrivers(), ["name", "license"]],
      ["Maintenance", D().getMaintenanceRecords(), ["id", "status", "notes"]],
      ["Schedules", D().getMaintenanceSchedules(), ["id", "status"]],
    ];
    if (session().role === "admin")
      groups.push(["Users", D().getUsers(), ["name", "email", "role"]]);
    return (
      head(
        "Search",
        "Search role-appropriate frontend demonstration records.",
      ) +
      `<section class="card"><form id="search-page-form" class="toolbar"><div class="field"><label for="page-query">Search term</label><input id="page-query" name="q" value="${V()(q)}"></div><button class="button button-primary">Search</button></form>${
        q
          ? groups
              .map(([name, items, keys]) => {
                const found = items.filter((x) =>
                  keys.some((k) =>
                    String(x[k] || "")
                      .toLowerCase()
                      .includes(q.toLowerCase()),
                  ),
                );
                return `<div class="mt-4"><h2>${name} <span class="muted">(${found.length})</span></h2>${simpleList(
                  found.map((x) => [
                    x.name || x.plate || x.id,
                    keys
                      .map((k) => x[k])
                      .filter(Boolean)
                      .join(" · "),
                    x.status || "Match",
                  ]),
                )}</div>`;
              })
              .join("")
          : '<div class="empty-state"><strong>Search ForgeFleet</strong>Enter a term to find demo records.</div>'
      }</section>`
    );
  }
  function bind(page) {
    const cfg = configs[page];
    document
      .querySelector("[data-add]")
      ?.addEventListener("click", () => openForm(cfg));
    document.querySelectorAll("[data-edit]").forEach((b) =>
      b.addEventListener("click", () =>
        openForm(
          cfg,
          D()
            [cfg.get]()
            .find((x) => x.id === b.dataset.edit),
        ),
      ),
    );
    document.querySelectorAll("[data-delete]").forEach((b) =>
      b.addEventListener("click", () => {
        ForgeFleetModal.open({
          title: "Confirm deletion",
          body: "<p>This removes the selected demo record from localStorage.</p>",
          actions:
            '<button class="button" data-modal-close>Cancel</button><button class="button button-danger" id="confirm-delete">Delete</button>',
          onReady() {
            document
              .getElementById("confirm-delete")
              .addEventListener("click", () => {
                try {
                  const removeRecord = deleteActions[cfg.collection];
                  if (!removeRecord) {
                    throw new Error("This record type cannot be deleted.");
                  }
                  removeRecord(b.dataset.delete);
                  ForgeFleetModal.close();
                  ForgeFleetToast("Demo record deleted.");
                  render();
                } catch (error) {
                  ForgeFleetToast(error.message, "error");
                }
              });
          },
        });
      }),
    );
    document.querySelectorAll("[data-end]").forEach((b) =>
      b.addEventListener("click", () => {
        try {
          D().endAssignment(b.dataset.end);
          ForgeFleetToast("Assignment ended.");
          render();
        } catch (e) {
          ForgeFleetToast(e.message, "error");
        }
      }),
    );
    document.getElementById("table-search")?.addEventListener("input", (e) => {
      state.search = e.target.value;
      state.page = 1;
      render();
    });
    document
      .getElementById("status-filter")
      ?.addEventListener("change", (e) => {
        state.status = e.target.value;
        state.page = 1;
        render();
      });
    document.querySelectorAll("[data-sort]").forEach((b) =>
      b.addEventListener("click", () => {
        state.dir = state.sort === b.dataset.sort ? -state.dir : 1;
        state.sort = b.dataset.sort;
        render();
      }),
    );
    document
      .querySelector("[data-page-prev]")
      ?.addEventListener("click", () => {
        state.page--;
        render();
      });
    document
      .querySelector("[data-page-next]")
      ?.addEventListener("click", () => {
        state.page++;
        render();
      });
    document.getElementById("mark-all")?.addEventListener("click", () => {
      D().markAllNotificationsAsRead(session());
      ForgeFleetToast("Notifications marked as read.");
      render();
    });
    document.querySelectorAll("[data-read]").forEach((b) =>
      b.addEventListener("click", () => {
        D().markNotificationAsRead(b.dataset.read);
        render();
      }),
    );
    document.getElementById("profile-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const x = Object.fromEntries(new FormData(e.currentTarget)),
        valid =
          ForgeFleetValidation.required(x.name) &&
          ForgeFleetValidation.email(x.email) &&
          ForgeFleetValidation.phone(x.phone);
      if (!valid) {
        ForgeFleetToast("Check the profile fields.", "error");
        return;
      }
      D().updateProfile(session().id, x);
      const u = D().getUserById(session().id);
      ForgeFleetAuth.set(u);
      ForgeFleetToast("Profile saved.");
      setTimeout(() => location.reload(), 300);
    });
    document.getElementById("export-csv")?.addEventListener("click", () => {
      const safe = (v) => {
        v = String(v ?? "");
        if (/^[=+\-@]/.test(v)) v = "'" + v;
        return '"' + v.replace(/"/g, '""') + '"';
      };
      const rows = [
        ["ID", "Vehicle", "Status", "Cost"],
        ...D()
          .getMaintenanceRecords()
          .map((x) => [
            x.id,
            resolve("vehicleId", x.vehicleId),
            x.status,
            x.cost,
          ]),
      ];
      const blob = new Blob(
          [rows.map((r) => r.map(safe).join(",")).join("\r\n")],
          { type: "text/csv" },
        ),
        a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "forgefleet-report.csv";
      a.click();
      URL.revokeObjectURL(a.href);
      ForgeFleetToast("CSV demonstration exported.");
    });
  }
  function render() {
    const page = document.body.dataset.page,
      role = document.body.dataset.role,
      main = document.getElementById("page-content");
    if (!main) return;
    if (page === "dashboard") main.innerHTML = dashboard(role);
    else if (page === "reports") main.innerHTML = reports();
    else if (page === "notifications") main.innerHTML = notifications();
    else if (page === "profile") main.innerHTML = profile();
    else if (page === "assigned-vehicle") main.innerHTML = assignedVehicle();
    else if (page === "maintenance-reminders") main.innerHTML = reminders();
    else if (page === "search") main.innerHTML = search();
    else if (configs[page]) main.innerHTML = management(page);
    else
      main.innerHTML =
        head(labels[page] || "ForgeFleet", "Frontend demonstration page.") +
        '<div class="card empty-state"><strong>Page ready</strong>No demo records are currently available.</div>';
    bind(page);
  }
  async function init() {
    if (
      document.body.dataset.public !== "true" &&
      !window.ForgeFleetAuth.require()
    )
      return;
    await ForgeFleetComponents.load();
    ForgeFleetNavigation.init();
    render();
  }
  document.addEventListener("DOMContentLoaded", init);
  window.ForgeFleetApp = { render };
})();
