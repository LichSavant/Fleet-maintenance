(function () {
  "use strict";
  let trigger = null;
  const focusables =
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  function refs() {
    return {
      backdrop: document.getElementById("modal-backdrop"),
      title: document.getElementById("modal-title"),
      body: document.getElementById("modal-body"),
      actions: document.getElementById("modal-actions"),
    };
  }
  function close() {
    const r = refs();
    if (!r.backdrop || r.backdrop.hidden) return;
    r.backdrop.hidden = true;
    document.body.style.overflow = "";
    if (trigger) trigger.focus();
  }
  function open({ title, body, actions = "", onReady }) {
    const r = refs();
    trigger = document.activeElement;
    r.title.textContent = title;
    r.body.innerHTML = body;
    r.actions.innerHTML = actions;
    r.backdrop.hidden = false;
    document.body.style.overflow = "hidden";
    const first = r.backdrop.querySelector(focusables);
    if (first) first.focus();
    if (onReady) onReady(r);
  }
  document.addEventListener("click", (e) => {
    if (
      e.target.matches("[data-modal-close]") ||
      e.target.id === "modal-backdrop"
    )
      close();
  });
  document.addEventListener("keydown", (e) => {
    const r = refs();
    if (!r.backdrop || r.backdrop.hidden) return;
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key === "Tab") {
      const items = [...r.backdrop.querySelectorAll(focusables)];
      if (!items.length) return;
      const first = items[0],
        last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  window.ForgeFleetModal = { open, close };
})();
