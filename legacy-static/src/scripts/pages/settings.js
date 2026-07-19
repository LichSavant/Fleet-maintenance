(function () {
  document.addEventListener("DOMContentLoaded", async () => {
    if (!ForgeFleetAuth.require()) return;
    await ForgeFleetComponents.load();
    ForgeFleetNavigation.init();
    const key = "forgefleet_preferences",
      saved = JSON.parse(
        localStorage.getItem(key) ||
          '{"compactTables":false,"reducedMotion":false}',
      );
    document.getElementById("page-content").innerHTML =
      `<header class="page-head"><div><p class="eyebrow">Frontend preferences</p><h1>Settings</h1><p>Manage browser-only presentation preferences and demo data.</p></div></header><section class="card"><form id="settings-form" class="stack"><label class="list-item"><span><strong>Compact tables</strong><small>Reduce table row spacing in this browser.</small></span><input name="compactTables" type="checkbox" ${saved.compactTables ? "checked" : ""}></label><label class="list-item"><span><strong>Reduce interface motion</strong><small>Prefer minimal demonstration animation.</small></span><input name="reducedMotion" type="checkbox" ${saved.reducedMotion ? "checked" : ""}></label><div class="cluster"><button class="button button-primary" type="submit">Save preferences</button><button class="button button-danger" id="settings-reset" type="button">Reset demo data</button></div></form></section>`;
    document.getElementById("settings-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      localStorage.setItem(
        key,
        JSON.stringify({
          compactTables: f.has("compactTables"),
          reducedMotion: f.has("reducedMotion"),
        }),
      );
      ForgeFleetToast("Frontend preferences saved.");
    });
    document.getElementById("settings-reset").addEventListener("click", () => {
      if (confirm("Reset all demo records and registered accounts?")) {
        ForgeFleetData.resetDemoData();
        ForgeFleetAuth.logout();
      }
    });
  });
})();
