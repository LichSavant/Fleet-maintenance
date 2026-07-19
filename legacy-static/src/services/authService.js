(function () {
  "use strict";
  const SESSION_KEY = "forgefleet_session",
    REMEMBER_KEY = "forgefleet_remembered_email";
  const destinations = {
    admin: "admin/dashboard.html",
    manager: "manager/dashboard.html",
    mechanic: "mechanic/dashboard.html",
    driver: "driver/dashboard.html",
  };
  function get() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    } catch (e) {
      return null;
    }
  }
  function set(user, remember = false) {
    const session = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      initials:
        user.initials ||
        user.name
          .split(/\s+/)
          .map((x) => x[0])
          .slice(0, 2)
          .join("")
          .toUpperCase(),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    if (remember) localStorage.setItem(REMEMBER_KEY, user.email);
    else localStorage.removeItem(REMEMBER_KEY);
    return session;
  }
  function clear() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(REMEMBER_KEY);
  }
  function root() {
    return document.body.dataset.depth === "1" ? "../" : "";
  }
  function destination(role, fromRoot = true) {
    return (fromRoot ? "" : "../") + destinations[role];
  }
  function requireSession() {
    const user = get(),
      depth = root();
    if (!user) {
      location.replace(depth + "login.html");
      return null;
    }
    const required = document.body.dataset.role;
    if (required && required !== "shared" && required !== user.role) {
      location.replace(depth + destinations[user.role]);
      return null;
    }
    return user;
  }
  function logout() {
    clear();
    location.replace(root() + "login.html");
  }
  window.ForgeFleetAuth = {
    get,
    set,
    clear,
    destination,
    require: requireSession,
    logout,
    rememberedEmail() {
      return localStorage.getItem(REMEMBER_KEY) || "";
    },
  };
})();
