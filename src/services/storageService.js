(function () {
  "use strict";
  const KEY = "forgefleet_demo_v1";
  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }
  window.ForgeFleetStorage = {
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      const data = clone(window.ForgeFleetDefaults);
      this.save(data);
      return data;
    },
    save(data) {
      localStorage.setItem(KEY, JSON.stringify(data));
    },
    reset() {
      const data = clone(window.ForgeFleetDefaults);
      this.save(data);
      return data;
    },
    available() {
      try {
        const k = "__ff_test";
        localStorage.setItem(k, "1");
        localStorage.removeItem(k);
        return true;
      } catch (e) {
        return false;
      }
    },
  };
})();
