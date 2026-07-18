(function () {
  "use strict";
  const roles = {
    driver: {
      description:
        "Views an assigned vehicle, submits mileage, and receives maintenance reminders.",
      fields: [
        ["employeeId", "Driver ID or employee number", "text"],
        ["license", "License number", "text"],
        ["licenseExpiration", "License expiration date", "date"],
        ["depot", "Preferred depot or branch", "text"],
      ],
    },
    mechanic: {
      description:
        "Handles assigned maintenance work, findings, service updates, and history.",
      fields: [
        ["employeeId", "Mechanic ID or employee number", "text"],
        ["specialization", "Specialization", "text"],
        ["certification", "Certification or qualification", "text"],
        ["depot", "Workshop or depot", "text"],
      ],
    },
    manager: {
      description:
        "Coordinates vehicles, drivers, assignments, schedules, and operations.",
      fields: [
        ["employeeId", "Manager ID or employee number", "text"],
        ["depot", "Department or depot", "text"],
        ["approvalCode", "Invitation or approval code", "password"],
      ],
    },
    admin: {
      description:
        "Manages users, fleet records, services, reports, and system settings.",
      fields: [
        ["employeeId", "Admin ID or employee number", "text"],
        ["department", "Department", "text"],
        ["approvalCode", "Admin registration code", "password"],
      ],
    },
  };
  const icon =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>';
  document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("role-grid"),
      fields = document.getElementById("role-fields"),
      form = document.getElementById("signup-form"),
      message = document.getElementById("signup-message");
    grid.innerHTML = Object.entries(roles)
      .map(
        ([role, x]) =>
          `<label class="role-option"><input type="radio" name="role" value="${role}"><span class="role-card">${icon}<strong>${role[0].toUpperCase() + role.slice(1)}</strong><small>${x.description}</small></span></label>`,
      )
      .join("");
    function renderRole(role) {
      fields.innerHTML = role
        ? roles[role].fields
            .map(
              ([name, label, type]) =>
                `<div class="field"><label for="role-${name}">${label}</label><input id="role-${name}" name="${name}" type="${type}"><span class="field-error" data-error-for="${name}"></span></div>`,
            )
            .join("")
        : "";
    }
    grid.addEventListener("change", (e) => {
      if (e.target.name === "role") renderRole(e.target.value);
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      message.textContent = "";
      form
        .querySelectorAll(".field-error")
        .forEach((x) => (x.textContent = ""));
      const values = Object.fromEntries(new FormData(form)),
        setError = (name, text) => {
          const el = form.querySelector(`[data-error-for="${name}"]`);
          if (el) el.textContent = text;
          return false;
        };
      let valid = true;
      if (!ForgeFleetValidation.required(values.name))
        valid = setError("name", "Full name is required.");
      if (!ForgeFleetValidation.email(values.email))
        valid = setError("email", "Enter a valid email address.");
      else if (ForgeFleetData.emailExists(values.email))
        valid = setError("email", "That email is already registered.");
      if (!ForgeFleetValidation.phone(values.phone))
        valid = setError("phone", "Enter a valid phone number.");
      if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(values.password || ""))
        valid = setError(
          "password",
          "Use at least eight characters with letters and numbers.",
        );
      if (values.confirmPassword !== values.password)
        valid = setError("confirmPassword", "Passwords do not match.");
      if (!values.role) valid = setError("role", "Select an operational role.");
      if (values.role) {
        roles[values.role].fields.forEach(([name]) => {
          if (!ForgeFleetValidation.required(values[name]))
            valid = setError(name, "This role field is required.");
        });
        if (
          values.role === "driver" &&
          values.licenseExpiration &&
          values.licenseExpiration < new Date().toISOString().slice(0, 10)
        )
          valid = setError(
            "licenseExpiration",
            "License expiration cannot be in the past.",
          );
        if (values.role === "manager" && values.approvalCode !== "MANAGER2026")
          valid = setError(
            "approvalCode",
            "The Manager demonstration code is invalid.",
          );
        if (values.role === "admin" && values.approvalCode !== "ADMIN2026")
          valid = setError(
            "approvalCode",
            "The Admin demonstration code is invalid.",
          );
      }
      if (!values.terms)
        valid = setError("terms", "Confirm the frontend demonstration terms.");
      if (!valid) {
        message.textContent = "Review the highlighted registration fields.";
        return;
      }
      const profile = {};
      roles[values.role].fields.forEach(([name]) => {
        if (name !== "approvalCode")
          profile[name] = String(values[name]).trim();
      });
      try {
        const user = ForgeFleetData.registerAccount({
          name: values.name,
          email: values.email,
          phone: values.phone,
          password: values.password,
          role: values.role,
          profile,
        });
        document.getElementById("signup-content").innerHTML =
          `<div class="signup-success"><p class="eyebrow">Account created</p><h1>Welcome, ${ForgeFleetValidation.escape(user.name)}.</h1><p class="muted">Your ${ForgeFleetValidation.escape(user.role)} demonstration account is stored in this browser.</p><a class="button button-primary button-block mt-4" href="login.html">Continue to Sign In</a></div>`;
      } catch (error) {
        message.textContent = error.message;
      }
    });
  });
})();
