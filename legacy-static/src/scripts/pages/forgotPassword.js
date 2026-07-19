(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("forgot-form"),
      message = document.getElementById("forgot-message");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = new FormData(form).get("email"),
        error = document.querySelector("[data-error-for=email]");
      error.textContent = "";
      message.textContent = "";
      if (!ForgeFleetValidation.email(email)) {
        error.textContent = "Enter a valid email address.";
        return;
      }
      message.textContent =
        "If this email is registered, password recovery instructions would be sent by the completed system. No email was sent by this prototype.";
      message.className = "auth-message text-success";
    });
  });
})();
