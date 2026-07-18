(function () {
  window.ForgeFleetValidation = {
    email: (v) => /^\S+@\S+\.\S+$/.test(v),
    phone: (v) => /^\+?[0-9 ()-]{7,20}$/.test(v),
    required: (v) => String(v ?? "").trim().length > 0,
    escape: (v) =>
      String(v ?? "").replace(
        /[&<>'"]/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;",
          })[c],
      ),
  };
})();
