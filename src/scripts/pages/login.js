(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", () => {
    const existing = ForgeFleetAuth.get();
    if (existing) {
      location.replace(ForgeFleetAuth.destination(existing.role));
      return;
    }
    const form = document.getElementById("login-form"),
      toggle = document.getElementById("password-toggle"),
      password = document.getElementById("password"),
      email = document.getElementById("email"),
      general = document.getElementById("login-message"),
      roleHint = document.getElementById("role-hint");
    email.value = ForgeFleetAuth.rememberedEmail();
    toggle.addEventListener("click", () => {
      const show = password.type === "password";
      password.type = show ? "text" : "password";
      toggle.textContent = show ? "Hide" : "Show";
      toggle.setAttribute("aria-pressed", String(show));
    });
    email.addEventListener("blur", () => {
      const user = ForgeFleetData.getAll("users").find(
        (x) => x.email.toLowerCase() === email.value.trim().toLowerCase(),
      );
      roleHint.textContent = user
        ? `Signing in as ${user.role[0].toUpperCase() + user.role.slice(1)}`
        : "";
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const button = form.querySelector("[type=submit]");
      if (button.disabled) return;
      general.textContent = "";
      form
        .querySelectorAll(".field-error")
        .forEach((x) => (x.textContent = ""));
      const values = Object.fromEntries(new FormData(form));
      let ok = true;
      if (!ForgeFleetValidation.email(values.email)) {
        form.querySelector("[data-error-for=email]").textContent =
          "Enter a valid email address.";
        ok = false;
      }
      if (!ForgeFleetValidation.required(values.password)) {
        form.querySelector("[data-error-for=password]").textContent =
          "Enter your demo password.";
        ok = false;
      }
      if (!ok) return;
      button.disabled = true;
      button.textContent = "Signing in…";
      const result = ForgeFleetData.authenticate(values.email, values.password);
      setTimeout(() => {
        if (!result.user) {
          general.textContent =
            result.reason === "inactive"
              ? "This demo account is inactive. Contact an administrator."
              : "Email or password is invalid for this frontend demo.";
          button.disabled = false;
          button.textContent = "Sign in";
          return;
        }
        ForgeFleetAuth.set(result.user, values.remember === "on");
        location.replace(ForgeFleetAuth.destination(result.user.role));
      }, 300);
    });
  });
})();
