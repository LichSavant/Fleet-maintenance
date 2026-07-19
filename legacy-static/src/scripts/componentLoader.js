(function () {
  "use strict";
  const componentPaths = {
    footer: "layout/Footer.html",
    modal: "ui/Modal.html",
    sidebar: "layout/Sidebar.html",
    toast: "ui/Toast.html",
    topbar: "layout/Topbar.html",
  };

  async function loadOne(el) {
    const depth = document.body.dataset.depth === "1" ? "../" : "";
    const name = el.dataset.component;
    try {
      const componentPath = componentPaths[name];
      if (!componentPath) throw new Error(`Unknown component: ${name}`);
      const res = await fetch(depth + "src/components/" + componentPath);
      if (!res.ok) throw new Error(String(res.status));
      el.innerHTML = await res.text();
    } catch (e) {
      el.innerHTML =
        '<div class="card"><strong>Shared component unavailable</strong><p class="muted">Run ForgeFleet through Live Server so reusable components can load.</p></div>';
    }
  }
  window.ForgeFleetComponents = {
    async load() {
      await Promise.all(
        [...document.querySelectorAll("[data-component]")].map(loadOne),
      );
      document.dispatchEvent(new CustomEvent("forgefleet:components-ready"));
    },
  };
})();
