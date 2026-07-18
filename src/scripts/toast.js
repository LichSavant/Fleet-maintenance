(function () {
  window.ForgeFleetToast = function (message, type = "success") {
    const region = document.getElementById("toast-region");
    if (!region) return;
    const el = document.createElement("div");
    el.className = "toast " + type;
    el.textContent = message;
    region.append(el);
    setTimeout(() => el.remove(), 3200);
  };
})();
