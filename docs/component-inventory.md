# Component inventory

| Component                 | Source                                                 | Responsibility                                               |
| ------------------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| Sidebar                   | `src/components/layout/Sidebar.html`                   | Role navigation, active route, reset, logout                 |
| Topbar                    | `src/components/layout/Topbar.html`                    | Mobile menu, global search, notification count, profile menu |
| Footer                    | `src/components/layout/Footer.html`                    | Prototype/storage context                                    |
| Modal                     | `src/components/ui/Modal.html`, `src/scripts/modal.js` | Accessible CRUD and confirmation container                   |
| Toast                     | `src/components/ui/Toast.html`, `src/scripts/toast.js` | Polite success/error feedback                                |
| Cards/tables/forms/badges | `src/styles/components.css`                            | Shared visual primitives                                     |
| Page renderer             | `src/scripts/app.js`                                   | Dashboards, management pages, reports, shared views          |

Partials are fetched by `component-loader.js`; root/nested paths are controlled by `data-depth`.
