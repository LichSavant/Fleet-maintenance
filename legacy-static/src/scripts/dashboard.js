(function () {
  "use strict";
  const data = window.ForgeFleetDashboard;
  const iconPaths = {
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    dashboard:
      '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    truck:
      '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    route:
      '<path d="M5 19c5 0 3-7 8-7s3-7 6-7"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="5" r="2"/>',
    tool: '<path d="M14 7a5 5 0 0 0-6-4l3 3-5 5-3-3a5 5 0 0 0 7 6l7 7 4-4-7-7z"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-7M3 4v6h6"/><path d="M12 7v5l3 2"/>',
    chart: '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
    settings:
      '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5L9 6a8 8 0 0 0-1.7 1L5 6 3 9.5 5 11a7 7 0 0 0 0 2l-2 1.5L5 18l2.3-1a8 8 0 0 0 1.7 1l.5 3h5l.4-3a8 8 0 0 0 1.7-1l2.4 1 2-3.5-2.1-1.5a7 7 0 0 0 .1-1z"/>',
    clipboard:
      '<path d="M9 5h6M9 3h6v4H9z"/><rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 12h6M9 16h5"/>',
    shield:
      '<path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6z"/><path d="m9 12 2 2 4-5"/>',
    home: '<path d="m3 11 9-8 9 8M5 10v10h14V10M9 20v-6h6v6"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    activity: '<path d="M3 12h4l2-7 4 14 2-7h6"/>',
    gauge: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="m12 13 4-4"/>',
    pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2"/>',
    logout: '<path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10"/>',
  };
  const svg = (name, label = "") =>
    `<svg viewBox="0 0 24 24" aria-hidden="${label ? "false" : "true"}" ${label ? `aria-label="${label}"` : ""}>${iconPaths[name] || iconPaths.dashboard}</svg>`;
  const escape = window.ForgeFleetValidation.escape;
  const tone = (s) =>
    s === "Overdue" || s === "Priority"
      ? "red"
      : s === "Due Soon" || s === "In Progress"
        ? "yellow"
        : s === "Completed" || s === "Ready"
          ? "green"
          : "gold";
  const nav = [
    ["dashboard", "Dashboard", "dashboard.html", "dashboard"],
    ["truck", "Vehicles", "vehicles.html", "vehicles"],
    ["user", "Drivers", "drivers.html", "drivers"],
    ["route", "Mileage Logs", "../driver/mileage.html", "mileage"],
    ["tool", "Service Types", "service-types.html", "service"],
    ["history", "Maintenance History", "maintenance.html", "maintenance"],
    ["chart", "Reports", "reports.html", "reports"],
    ["bell", "Reminders", "../driver/maintenance-reminders.html", "reminders"],
    ["user", "Users", "users.html", "users"],
    ["settings", "Settings", "../shared/profile.html", "settings"],
  ];
  let activeDropdown = null,
    lastTrigger = null;
  function sidebar() {
    const aside = document.getElementById("sidebar");
    aside.innerHTML = `<a class="brand" href="dashboard.html" aria-label="ForgeFleet Command Center"><span class="brand-mark" aria-hidden="true">FF</span><span><strong>ForgeFleet</strong><small>Maintenance OS</small></span></a><nav class="sidebar-nav" aria-label="Primary navigation">${nav.map(([i, l, h, id]) => `<a class="nav-link ${id === "dashboard" ? "active" : ""}" href="${h}" title="${l}" ${id === "dashboard" ? 'aria-current="page"' : ""}><span class="nav-icon">${svg(i)}</span><span>${l}</span></a>`).join("")}</nav><div class="sidebar-foot"><div class="sidebar-alert"><strong>6</strong><p>Priority work orders</p><span>3 overdue services need attention</span></div><button class="button button-ghost button-block sidebar-collapse" id="sidebar-collapse" type="button" aria-expanded="true">${svg("chevron")}<span>Collapse</span></button><button class="button button-ghost button-block" id="logout-button" type="button">${svg("logout")}<span class="sr-only">Sign out</span></button></div>`;
  }
  function topbar() {
    const top = document.querySelector(".topbar");
    top.innerHTML = `<button class="icon-button mobile-menu" id="menu-toggle" type="button" aria-label="Toggle navigation" aria-controls="sidebar" aria-expanded="false">${svg("menu")}</button><form class="topbar-search" id="dashboard-search" role="search"><label class="sr-only" for="command-search">Search fleet</label><input id="command-search" type="search" autocomplete="off" placeholder="Search fleet, assets, work"><button id="search-clear" type="button" aria-label="Clear search" hidden></button><div class="search-overlay" id="search-results" role="listbox" hidden></div></form><div class="topbar-actions"><div class="new-action-wrap"><button class="command-button gold" id="new-action-trigger" type="button" aria-expanded="false" aria-controls="new-action-menu">${svg("plus")} New Action</button><div class="command-dropdown" id="new-action-menu" hidden><button data-action="Add Vehicle">${svg("truck")}Add Vehicle</button><button data-action="Add Driver">${svg("user")}Add Driver</button><button data-action="Create Work Order">${svg("clipboard")}Create Work Order</button><button data-action="Log Mileage">${svg("route")}Log Mileage</button><button data-action="Schedule Service">${svg("tool")}Schedule Service</button></div></div><div class="new-action-wrap"><button class="icon-button" id="notification-trigger" type="button" aria-label="Notifications" aria-expanded="false" aria-controls="notification-menu">${svg("bell")}<span class="notification-count">3</span></button><div class="command-dropdown" id="notification-menu" hidden>${data.notifications.map((n) => `<button data-notification="${n.id}"><span class="tone-${n.tone}">●</span><span><strong>${escape(n.title)}</strong><small>${escape(n.time)}</small></span></button>`).join("")}<a href="../shared/notifications.html">View all notifications</a></div></div><div class="new-action-wrap"><button class="profile-trigger" id="command-profile" type="button" aria-expanded="false" aria-controls="command-profile-menu"><span class="avatar">${data.currentUser.initials}</span><span class="profile-copy"><strong>${data.currentUser.name}</strong><small>${data.currentUser.subtitle}</small></span>${svg("chevron")}</button><div class="command-dropdown" id="command-profile-menu" hidden><a href="../shared/profile.html">Profile settings</a><button id="profile-signout">${svg("logout")}Sign out</button></div></div></div>`;
  }
  function main() {
    document.getElementById("page-content").innerHTML =
      `<header class="command-header"><div class="command-heading"><div class="command-breadcrumb">${svg("home")}<span>ForgeFleet</span><span>/</span><span>Dashboard</span></div><div class="command-title-row"><span class="command-title-icon">${svg("dashboard")}</span><div><p class="eyebrow">ForgeFleet</p><h1>Command Center</h1></div></div><p>Live maintenance visibility across every depot.</p></div><div class="attention-strip">${svg("tool")}<span><strong>Critical attention:</strong> 3 overdue services · 6 priority work orders</span></div></header><section class="dashboard-top"><article class="command-card hero-asset"><div class="hero-top"><span class="status-pill tone-green">● Ready</span><span class="hero-asset-id">${data.hero.asset}</span></div><div class="hero-copy"><p class="eyebrow">Hero Vehicle</p><h2>${data.hero.name}<span>${data.hero.number}</span></h2><p class="hero-type">${data.hero.type}</p><div class="hero-metrics"><div class="hero-metric"><small>Health</small><strong>${data.hero.health}%</strong></div><div class="hero-metric"><small>Utilization</small><strong>${data.hero.utilization}%</strong></div><div class="hero-metric"><small>Mileage</small><strong>${data.hero.mileage.toLocaleString()}</strong></div></div></div><footer class="hero-footer"><div class="hero-facts"><div><small>Driver</small><strong>${data.hero.driver}</strong></div><div><small>Route</small><strong>${data.hero.route}</strong></div></div><button class="command-button gold" id="view-asset" type="button">View Asset ${svg("chevron")}</button></footer></article><article class="command-card trend-card"><div class="card-heading"><div><p class="eyebrow">Fleet Health Overview</p><h2>Readiness trend</h2></div><div class="chart-legend"><span><i class="legend-dot" style="background:#dbae51"></i>Readiness</span><span><i class="legend-dot" style="background:#39dc85"></i>Utilization</span></div></div><div class="trend-wrap" id="trend-chart"></div></article></section><section class="kpi-row">${data.kpis.map((k, i) => `<article class="command-card command-kpi" tabindex="0"><span class="kpi-icon tone-${k.tone}">${svg(k.icon)}</span><div><span class="kpi-label">${k.label}</span><strong class="kpi-value">${k.value}</strong><span class="kpi-detail tone-${k.tone}">${k.detail}</span></div></article>`).join("")}</section><section class="lower-grid"><article class="command-card lower-card"><div class="card-heading"><div><p class="eyebrow">Live Fleet</p><h2>Operations</h2></div></div><div class="operation-list">${data.operations.map((o) => `<div class="operation-row tone-${o.tone}"><p>${o.label}</p><strong>${o.value}</strong><div class="operation-bar"><span style="width:${(o.value / o.total) * 100}%"></span></div></div>`).join("")}</div><div class="critical-box"><div><strong class="tone-red">3</strong><span>Overdue services</span></div><div><strong class="tone-yellow">6</strong><span>Priority orders</span></div></div></article><article class="command-card lower-card"><div class="card-heading"><div><p class="eyebrow">Service Queue</p><h2>Upcoming reminders</h2></div><a class="compact-action" href="maintenance.html">View all</a></div><div class="compact-list">${data.reminders.map((r) => `<div class="compact-item"><div><h3>${r.asset} · ${r.service}</h3><p>${r.vehicle} · ${r.due} · ${r.threshold}</p></div><div class="compact-actions"><span class="status-pill tone-${tone(r.status)}">${r.status}</span><button class="compact-action" data-reminder="${r.id}" type="button">View</button></div></div>`).join("")}</div></article><article class="command-card lower-card"><div class="card-heading"><div><p class="eyebrow">Workshop Feed</p><h2>Recent maintenance</h2></div><a class="compact-action" href="maintenance.html">View all</a></div><div class="compact-list">${data.activity.map((a) => `<div class="compact-item"><div><h3>${a.asset} · ${a.action}</h3><p>${a.mechanic} · ${a.time} · ${a.cost}</p></div><div class="compact-actions"><span class="status-pill tone-${tone(a.status)}">${a.status}</span><button class="compact-action" data-activity="${a.id}" type="button">Details</button></div></div>`).join("")}</div></article></section>`;
  }
  function chart() {
    const el = document.getElementById("trend-chart"),
      W = 520,
      H = 280,
      p = { l: 36, r: 12, t: 16, b: 28 },
      x = (i) => p.l + (i * (W - p.l - p.r)) / 6,
      y = (v) => p.t + ((100 - v) * (H - p.t - p.b)) / 100,
      path = (arr) =>
        arr.map((v, i) => (i ? "L" : "M") + x(i) + " " + y(v)).join(" "),
      area = (arr) =>
        path(arr) + ` L ${x(6)} ${H - p.b} L ${x(0)} ${H - p.b} Z`;
    el.innerHTML = `<svg class="trend-svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="trend-title trend-desc"><title id="trend-title">Fleet readiness and utilization from January to July</title><desc id="trend-desc">Readiness rises from 88 to 95 percent. Utilization rises from 76 to 92 percent.</desc>${[0, 20, 40, 60, 80, 100].map((v) => `<line class="trend-grid" x1="${p.l}" y1="${y(v)}" x2="${W - p.r}" y2="${y(v)}"/><text class="trend-axis" x="2" y="${y(v) + 3}">${v}</text>`).join("")}<path class="trend-area" fill="#dbae51" d="${area(data.trend.readiness)}"/><path class="trend-area" fill="#39dc85" d="${area(data.trend.utilization)}"/><path class="trend-line" stroke="#dbae51" d="${path(data.trend.readiness)}"/><path class="trend-line" stroke="#39dc85" d="${path(data.trend.utilization)}"/>${data.trend.months.map((m, i) => `<text class="trend-axis" x="${x(i)}" y="${H - 6}" text-anchor="middle">${m}</text><circle class="trend-point" data-chart-point="${i}" tabindex="0" aria-label="${m}: readiness ${data.trend.readiness[i]}, utilization ${data.trend.utilization[i]}" cx="${x(i)}" cy="${y(data.trend.readiness[i])}" r="5" fill="#dbae51"/><circle class="trend-point" data-chart-point="${i}" tabindex="0" aria-hidden="true" cx="${x(i)}" cy="${y(data.trend.utilization[i])}" r="5" fill="#39dc85"/>`).join("")}</svg><div class="chart-tooltip" id="chart-tooltip" hidden></div>`;
    const tip = document.getElementById("chart-tooltip");
    function show(i, node) {
      tip.innerHTML = `<strong>${data.trend.months[i]}</strong><div class="tone-gold">Readiness: ${data.trend.readiness[i]}</div><div class="tone-green">Utilization: ${data.trend.utilization[i]}</div>`;
      tip.style.left = (node.getAttribute("cx") / W) * 100 + "%";
      tip.style.top = (node.getAttribute("cy") / H) * 100 + "%";
      tip.hidden = false;
    }
    el.querySelectorAll("[data-chart-point]").forEach((n) => {
      n.addEventListener("mouseenter", () => show(+n.dataset.chartPoint, n));
      n.addEventListener("focus", () => show(+n.dataset.chartPoint, n));
      n.addEventListener("mouseleave", () => (tip.hidden = true));
      n.addEventListener("blur", () => (tip.hidden = true));
    });
  }
  function dropdown(triggerId, menuId) {
    const trigger = document.getElementById(triggerId),
      menu = document.getElementById(menuId);
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = menu.hidden;
      closeDropdowns();
      menu.hidden = !open;
      trigger.setAttribute("aria-expanded", String(open));
      if (open) {
        activeDropdown = menu;
        lastTrigger = trigger;
      }
    });
  }
  function closeDropdowns() {
    document
      .querySelectorAll(".command-dropdown")
      .forEach((m) => (m.hidden = true));
    document.querySelectorAll('[aria-expanded="true"]').forEach((x) => {
      if (x.id !== "menu-toggle") x.setAttribute("aria-expanded", "false");
    });
    activeDropdown = null;
  }
  function openInfo(title, rows) {
    ForgeFleetModal.open({
      title,
      body: `<div class="stack">${rows.map(([k, v]) => `<div class="list-item"><span class="muted">${escape(k)}</span><strong>${escape(v)}</strong></div>`).join("")}</div>`,
      actions:
        '<button class="button button-primary" data-modal-close type="button">Close</button>',
    });
  }
  function events() {
    const shell = document.querySelector(".command-shell"),
      saved = localStorage.getItem("forgefleet_sidebar_collapsed") === "true";
    shell.classList.toggle("sidebar-collapsed", saved);
    document
      .getElementById("sidebar-collapse")
      .addEventListener("click", () => {
        const val = !shell.classList.contains("sidebar-collapsed");
        shell.classList.toggle("sidebar-collapsed", val);
        localStorage.setItem("forgefleet_sidebar_collapsed", String(val));
        document
          .getElementById("sidebar-collapse")
          .setAttribute("aria-expanded", String(!val));
      });
    const menu = document.getElementById("menu-toggle"),
      scrim = document.getElementById("sidebar-scrim");
    function mobile(open) {
      document.body.classList.toggle("nav-open", open);
      menu.setAttribute("aria-expanded", String(open));
    }
    menu.addEventListener("click", () =>
      mobile(!document.body.classList.contains("nav-open")),
    );
    scrim.addEventListener("click", () => mobile(false));
    dropdown("new-action-trigger", "new-action-menu");
    dropdown("notification-trigger", "notification-menu");
    dropdown("command-profile", "command-profile-menu");
    document.addEventListener("click", (e) => {
      if (activeDropdown && !activeDropdown.contains(e.target))
        closeDropdowns();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeDropdowns();
        mobile(false);
        document.getElementById("search-results").hidden = true;
      }
    });
    document.querySelectorAll("[data-action]").forEach((b) =>
      b.addEventListener("click", () => {
        closeDropdowns();
        const routes = {
          "Add Vehicle": "vehicles.html",
          "Add Driver": "drivers.html",
          "Create Work Order": "maintenance.html",
          "Log Mileage": "../driver/mileage.html",
          "Schedule Service": "maintenance.html",
        };
        ForgeFleetToast(`${b.dataset.action} opened as a frontend workflow.`);
        setTimeout(() => (location.href = routes[b.dataset.action]), 450);
      }),
    );
    document.querySelectorAll("[data-notification]").forEach((b) =>
      b.addEventListener("click", () => {
        const n = data.notifications.find(
          (x) => x.id === b.dataset.notification,
        );
        closeDropdowns();
        openInfo(n.title, [
          ["Message", n.message],
          ["Received", n.time],
        ]);
      }),
    );
    document.getElementById("view-asset").addEventListener("click", () =>
      openInfo(`${data.hero.name} ${data.hero.number}`, [
        ["Asset", data.hero.asset],
        ["Status", data.hero.status],
        ["Driver", data.hero.driver],
        ["Route", data.hero.route],
        ["Health", data.hero.health + "%"],
        ["Utilization", data.hero.utilization + "%"],
        ["Mileage", data.hero.mileage.toLocaleString()],
        ["Next service", data.hero.nextService],
        ["Open work orders", String(data.hero.openOrders)],
      ]),
    );
    document.querySelectorAll("[data-reminder]").forEach((b) =>
      b.addEventListener("click", () => {
        const r = data.reminders.find((x) => x.id === b.dataset.reminder);
        openInfo(r.service, [
          ["Asset", r.asset],
          ["Vehicle", r.vehicle],
          ["Due", r.due],
          ["Mileage threshold", r.threshold],
          ["Status", r.status],
        ]);
      }),
    );
    document.querySelectorAll("[data-activity]").forEach((b) =>
      b.addEventListener("click", () => {
        const a = data.activity.find((x) => x.id === b.dataset.activity);
        openInfo(a.action, [
          ["Asset", a.asset],
          ["Mechanic", a.mechanic],
          ["Time", a.time],
          ["Cost", a.cost],
          ["Status", a.status],
        ]);
      }),
    );
    document
      .getElementById("logout-button")
      .addEventListener("click", () => ForgeFleetAuth.logout());
    document
      .getElementById("profile-signout")
      .addEventListener("click", () => ForgeFleetAuth.logout());
    const input = document.getElementById("command-search"),
      results = document.getElementById("search-results"),
      clear = document.getElementById("search-clear");
    function search() {
      const q = input.value.trim().toLowerCase();
      clear.hidden = !q;
      if (!q) {
        results.hidden = true;
        return;
      }
      const found = data.searchable
        .filter((x) =>
          (x.title + " " + x.detail + " " + x.type).toLowerCase().includes(q),
        )
        .slice(0, 6);
      results.innerHTML = found.length
        ? found
            .map(
              (x) =>
                `<button class="search-result" type="button" data-search-id="${x.id}"><strong>${escape(x.title)}</strong><small>${escape(x.type)} · ${escape(x.detail)}</small></button>`,
            )
            .join("")
        : '<div class="empty-state">No matching fleet records.</div>';
      results.hidden = false;
      results.querySelectorAll("[data-search-id]").forEach((b) =>
        b.addEventListener("click", () => {
          const item = data.searchable.find((x) => x.id === b.dataset.searchId);
          results.hidden = true;
          openInfo(item.title, [
            ["Type", item.type],
            ["Record ID", item.id],
            ["Details", item.detail],
          ]);
        }),
      );
    }
    input.addEventListener("input", search);
    input.addEventListener("keydown", (e) => {
      const items = [...results.querySelectorAll(".search-result")];
      if (e.key === "ArrowDown" && items.length) {
        e.preventDefault();
        items[0].focus();
      }
      if (e.key === "Escape") {
        results.hidden = true;
        input.blur();
      }
    });
    results.addEventListener("keydown", (e) => {
      const items = [...results.querySelectorAll(".search-result")],
        i = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown" && i < items.length - 1) {
        e.preventDefault();
        items[i + 1].focus();
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        i > 0 ? items[i - 1].focus() : input.focus();
      }
    });
    clear.addEventListener("click", () => {
      input.value = "";
      search();
      input.focus();
    });
    document
      .getElementById("dashboard-search")
      .addEventListener("submit", (e) => e.preventDefault());
  }
  async function init() {
    const session = ForgeFleetAuth.require();
    if (!session) return;
    await ForgeFleetComponents.load();
    sidebar();
    topbar();
    main();
    chart();
    events();
  }
  document.addEventListener("DOMContentLoaded", init);
})();
