(function () {
  "use strict";
  const icons = {
    dashboard: "◈",
    vehicles: "▣",
    drivers: "♙",
    mileage: "⌁",
    services: "◇",
    maintenance: "⚒",
    reports: "▥",
    reminders: "♢",
    users: "◎",
    settings: "○",
    assignments: "⇄",
    schedules: "□",
    notifications: "♢",
    profile: "○",
  };
  const menus = {
    admin: [
      ["dashboard", "Dashboard"],
      ["vehicles", "Vehicles"],
      ["drivers", "Drivers"],
      ["mileage-logs", "Mileage Logs"],
      ["service-types", "Service Types"],
      ["maintenance", "Maintenance History"],
      ["reports", "Reports"],
      ["reminders", "Reminders"],
      ["users", "Users"],
      ["settings", "Settings"],
    ],
    manager: [
      ["dashboard", "Dashboard"],
      ["vehicles", "Vehicles"],
      ["drivers", "Drivers"],
      ["assignments", "Assignments"],
      ["schedules", "Maintenance Schedules"],
      ["reports", "Reports"],
      ["reminders", "Reminders"],
      ["profile", "Profile", "shared"],
    ],
    mechanic: [
      ["dashboard", "Dashboard"],
      ["maintenance", "Maintenance Tasks"],
      ["service-history", "Service History"],
      ["notifications", "Notifications"],
      ["profile", "Profile", "shared"],
    ],
    driver: [
      ["dashboard", "Dashboard"],
      ["mileage", "Mileage Logs"],
      ["assigned-vehicle", "Assigned Vehicle"],
      ["maintenance-reminders", "Maintenance Reminders"],
      ["notifications", "Notifications"],
      ["profile", "Profile", "shared"],
    ],
  };
  function init() {
    const body = document.body,
      session = ForgeFleetAuth.get(),
      role = session?.role || body.dataset.role,
      page = body.dataset.page,
      depth = body.dataset.depth === "1" ? "../" : "";
    document
      .querySelectorAll("[data-root-link]")
      .forEach((a) => (a.href = depth + a.dataset.rootLink));
    document
      .querySelectorAll("[data-shared-link]")
      .forEach((a) => (a.href = depth + "shared/" + a.dataset.sharedLink));
    const nav = document.getElementById("sidebar-nav");
    if (nav && menus[role])
      nav.innerHTML = menus[role]
        .map(([id, label, shared]) => {
          const href = shared
            ? depth + "shared/" + id + ".html"
            : depth + role + "/" + id + ".html";
          return `<a class="nav-link ${id === page ? "active" : ""}" href="${href}" ${id === page ? 'aria-current="page"' : ""}><span class="nav-icon" aria-hidden="true">${icons[id] || "◇"}</span><span>${label}</span></a>`;
        })
        .join("");
    if (session) {
      document
        .querySelectorAll("[data-user-name]")
        .forEach((x) => (x.textContent = session.name));
      document
        .querySelectorAll("[data-user-role]")
        .forEach(
          (x) =>
            (x.textContent =
              session.role[0].toUpperCase() + session.role.slice(1)),
        );
      document.querySelectorAll("[data-avatar]").forEach(
        (x) =>
          (x.textContent =
            session.initials ||
            session.name
              .split(/\s+/)
              .map((y) => y[0])
              .slice(0, 2)
              .join("")),
      );
    }
    const count = session
      ? ForgeFleetData.getNotifications(session).filter((n) => !n.read).length
      : 0;
    document
      .querySelectorAll("[data-notification-count]")
      .forEach((x) => (x.textContent = count));
    const menu = document.getElementById("menu-toggle"),
      drop = document.getElementById("profile-menu"),
      profile = document.getElementById("profile-trigger");
    menu?.addEventListener("click", () => {
      const open = document.body.classList.toggle("nav-open");
      menu.setAttribute("aria-expanded", String(open));
    });
    profile?.addEventListener("click", () => {
      drop.hidden = !drop.hidden;
      profile.setAttribute("aria-expanded", String(!drop.hidden));
    });
    document.addEventListener("click", (e) => {
      if (
        drop &&
        !drop.hidden &&
        !drop.contains(e.target) &&
        !profile?.contains(e.target)
      ) {
        drop.hidden = true;
        profile.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        document.body.classList.remove("nav-open");
        menu?.setAttribute("aria-expanded", "false");
        if (drop) {
          drop.hidden = true;
          profile?.setAttribute("aria-expanded", "false");
        }
      }
    });
    ["logout-button", "profile-logout"].forEach((id) =>
      document
        .getElementById(id)
        ?.addEventListener("click", () => ForgeFleetAuth.logout()),
    );
    document.getElementById("reset-demo")?.addEventListener("click", () => {
      if (
        confirm("Reset all ForgeFleet demo records and registered accounts?")
      ) {
        ForgeFleetData.resetDemoData();
        ForgeFleetToast("Demo data restored.");
        setTimeout(() => ForgeFleetAuth.logout(), 400);
      }
    });
    document
      .getElementById("topbar-search")
      ?.addEventListener("submit", (e) => {
        e.preventDefault();
        const q = new FormData(e.currentTarget).get("query");
        location.href = depth + "shared/search.html?q=" + encodeURIComponent(q);
      });
  }
  window.ForgeFleetNavigation = { init };
})();
