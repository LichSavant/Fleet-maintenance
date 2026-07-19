# ForgeFleet frontend audit

Audit date: 2026-07-19

Repository: `https://github.com/LichSavant/Fleet-maintenance.git`

Branch: `frontend-rebuild`

## 2026-07-19 completion update

The audit below is the historical assessment that guided the rebuild. All legacy paths mentioned in that assessment are now relative to `legacy-static/`. The archived static implementation is preserved there and is no longer the active application.

The active application is `frontend/`, using React, Vite, strict TypeScript, React Router, plain CSS, Vitest, Testing Library, ESLint, and Prettier. Final integration review confirmed:

- One shared authenticated layout and typed role-navigation configuration.
- Session restoration, signed-out redirects, cross-role protection, and functional sign out.
- Session-derived driver and mechanic profiles with no seeded current-account IDs in React pages.
- Linked self-service registration for Driver and Mechanic credentials, fleet users, and role profiles.
- Centralized browser persistence, relationship validation, work-order transitions, mileage validation, action-generated notifications, and data-derived reports.
- Accessible labeled forms, semantic controls, text-bearing statuses, focus-visible styling, focus-trapped dialogs and mobile navigation, and contained table overflow.
- Responsive rendered review at approximately 360, 768, 1024, and 1440 pixels with no application console errors.
- Removal of obsolete design-system, authentication-layout, dashboard-layout, and home scaffold preview pages from the production router.
- No import or asset dependency from `frontend/` to `legacy-static/`.

Remaining limitations are deliberate frontend-only constraints: browser-readable credentials and data, client-side authorization, no cross-device or cross-tab record synchronization, no concurrency control, no password change or recovery delivery, and no server-generated notifications, audit log, or reporting.

Audited commit: `27e5e7aca6a497047bf83e34e3e9719cce02ec3b`

## Executive summary

The repository currently contains a pure HTML5, CSS3, and browser JavaScript demonstration. It is not a React application: there is no `package.json`, Vite configuration, TypeScript configuration, JSX/TSX, module graph, or automated test runner. Public pages are separate HTML documents grouped by role. They fetch shared HTML partials and load global scripts that render page content into `#page-content`.

The prototype is more than a visual mock. It includes browser-local authentication, role redirects, management tables, CRUD modals, sorting, filtering, pagination, assignment conflict checks, mileage validation, notification read state, profile editing, settings persistence, report calculations, and CSV generation. These behaviors are useful requirements for the React rebuild, but the current browser storage and authorization model must remain demo-only.

The largest architectural issue is that the application has two competing dashboard systems. `src/scripts/app.js` renders most role dashboards from the normalized demo collections, while `admin/dashboard.html` uses `src/scripts/dashboard.js` and a second unrelated `ForgeFleetDashboard` dataset. The second system duplicates its own shell, navigation, search, profile, notification, charts, and user presentation. It also hardcodes the displayed current account and permanent dashboard counts.

## 1. Repository and toolchain

| Area            | Current state                                                                      |
| --------------- | ---------------------------------------------------------------------------------- |
| Git             | Clean repository on `frontend-rebuild`, created from `main` commit `27e5e7a`       |
| Framework       | None; static multi-page HTML                                                       |
| Language        | HTML, CSS, and classic browser JavaScript IIFEs                                    |
| Package manager | None configured                                                                    |
| Build system    | None                                                                               |
| Type system     | None                                                                               |
| Routing         | File paths, redirects, and `location.replace`                                      |
| Tests           | Documentation and ad hoc syntax/service checks; no executable test suite           |
| Persistence     | `localStorage` for records/preferences and `sessionStorage` for the active session |
| Backend/API     | None                                                                               |

All manually written source is currently formatted and readable. No empty files or compressed one-line source files were found.

## 2. Current structure and entry flow

Root authentication and reference pages:

- `index.html` redirects to the sign-in page.
- `login.html` is the public sign-in entry.
- `signup.html` creates browser-local demonstration accounts.
- `forgot-password.html` validates an email but explicitly does not send recovery mail.
- `404.html` is a static not-found page.
- `design-system.html` and `layout-test.html` are reference/test pages rather than product routes.

Role folders contain separate HTML entry documents:

- `admin/`: audit, dashboard, drivers, maintenance, mileage logs, reminders, reports, service types, settings, users, and vehicles.
- `manager/`: assignments, dashboard, drivers, maintenance redirect, reminders, reports, schedules, and vehicles.
- `mechanic/`: dashboard, maintenance tasks, notifications, and service history.
- `driver/`: assigned vehicle, dashboard, maintenance redirect, reminders, mileage, and notifications.
- `shared/`: notifications, profile, and search.

Each authenticated HTML page declares `data-page`, `data-role`, and `data-depth`, loads scripts in dependency order, fetches partials through `componentLoader.js`, initializes role navigation, and lets `app.js` render the main screen. The Administrator dashboard is the exception: it loads `dashboard.js`, which replaces the shared shell with its own implementation.

## 3. Shared components and visual system

Reusable partials:

| Partial                              | Responsibility                                          | Preserve for React                                           |
| ------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------ |
| `src/components/layout/Sidebar.html` | Brand, role navigation mount, reset, sign-out           | Preserve behavior and visual hierarchy                       |
| `src/components/layout/Topbar.html`  | Mobile menu, global search, notifications, account menu | Preserve and consolidate with command-center variant         |
| `src/components/layout/Footer.html`  | Prototype context                                       | Reassess; product shell may not need it                      |
| `src/components/ui/Modal.html`       | Accessible dialog shell                                 | Preserve focus trap, Escape, backdrop, and focus restoration |
| `src/components/ui/Toast.html`       | Live feedback container                                 | Preserve success/error feedback behavior                     |

Useful design elements:

- Dark charcoal surfaces with restrained gold accent.
- Inter font files in weights 400, 600, and 700, with license.
- ForgeFleet maintenance-bay hero image.
- CSS design tokens for color, spacing, radii, shadows, typography, shell sizes, and motion.
- Strong login split-screen treatment.
- Sidebar/topbar application shell and compact responsive patterns.
- Cards, metric cards, semantic tables, badges, toolbars, forms, empty states, modal, toast, notification list, and pagination styles.
- Visible focus treatments and reduced-motion rules.
- Horizontal table overflow at narrow widths.
- Administrator command-center hierarchy, trend chart treatment, attention strip, and dense operational presentation.

Visual liabilities to avoid carrying forward:

- Two separate shell/dashboard design implementations.
- Text glyphs used as navigation and action icons.
- CSS-only donut graphics that do not accurately communicate underlying data.
- Hardcoded Administrator command-center counts that conflict with the core dataset.
- Large template strings that mix markup, data access, permissions, and event binding.

## 4. Authentication and role handling

### Working behavior

- Sign-in validates email and required password fields.
- Active accounts authenticate against browser-local records.
- Inactive accounts receive a distinct message.
- The signed-in session stores user ID, name, email, role, and initials in `sessionStorage`.
- Remember-email stores only the email address in `localStorage`.
- Authenticated users visiting sign-in are redirected to their role dashboard.
- Protected pages redirect signed-out users to login.
- Cross-role page access redirects users to their own role dashboard.
- Sign-out clears session and remembered email.
- Registration validates required fields, email, phone, password strength, confirmation, role fields, terms, duplicate email, and driver license expiry.
- Driver and mechanic registration creates linked role-profile records.

### Prototype-only or unsafe behavior

- Seeded and registered passwords are stored and compared as plaintext in browser-readable data.
- Admin and Manager registration codes are shared constants in client JavaScript.
- Route guards and permissions are frontend-only and can be bypassed by altering storage or calling exposed services.
- Sessions are scoped to a browser tab and have no expiry, rotation, revocation, or integrity protection.
- The login email blur handler enumerates known accounts by displaying their role.
- Registration allows creation of privileged accounts when a visible shared code is entered.
- Forgot-password cannot deliver email and is intentionally informational only.

### Current-user hardcoding defects

The rebuild must not copy the following patterns:

- Mechanic dashboard metrics filter against literal `MEC-001`.
- Driver dashboard metrics filter against literal `DRV-001` and `VEH-001`.
- The command-center dataset contains a hardcoded `currentUser` named “Fleet Director.”
- The command-center topbar displays that static user instead of the authenticated session.
- The command-center notification indicator is permanently `3` rather than derived from notification state.

The assigned-vehicle page already demonstrates the correct direction: it resolves a driver by `session().id`, then finds that driver's active assignment and vehicle.

## 5. Navigation and routing

### Working behavior

- Role-specific sidebar menus are generated from a centralized map.
- Current routes receive `aria-current="page"` when the page identifier matches.
- Mobile navigation opens and closes, including Escape handling.
- Profile dropdown closes on outside click and Escape.
- Global search navigates to the shared search page with an encoded query.
- Authentication and sign-out redirects account for root versus nested page depth.
- Unknown root paths have a real static 404 document when the host is configured to use it.

### Problems and inconsistencies

- Navigation is file-path driven and depends on `data-depth` rather than a route model.
- Administrator navigation uses `mileage-logs` while the page declares `data-page="mileage"`, so its active state does not match.
- Administrator and Manager navigation use `reminders`, while those pages declare `maintenance-reminders`, so active state does not match.
- Driver and Mechanic each have role-folder notification pages while the topbar points to a shared notification page, creating duplicate URLs for the same feature.
- `driver/maintenance.html` and `manager/maintenance.html` are redirect aliases rather than substantive pages.
- The Administrator dashboard has a separate hardcoded navigation array with destinations that differ from the shared role menu.
- Static hosting must be configured manually; there is no SPA fallback or development/build configuration.

## 6. Data model and browser storage

The main demo dataset contains roles, users, drivers, mechanics, vehicles, assignments, service types, schedules, maintenance records, mileage logs, notifications, and audit logs. Core relationships use stable string IDs.

Useful rules to preserve:

- Normalized role/profile relationships through user IDs.
- Unique generated display IDs per collection.
- Duplicate-email checks.
- Protection against deleting the signed-in user or final active Administrator.
- Service-type deletion protection when referenced.
- One active vehicle per driver and one active driver per vehicle.
- Ending an assignment updates vehicle and driver state.
- Mileage cannot go backward and duplicate vehicle/date entries are rejected.
- Maintenance completion updates vehicle status.
- Notifications can be scoped by user or role and marked read.
- CSV cells beginning with spreadsheet formula characters are neutralized.

Limitations and defects:

- The entire data store is one JSON blob under `forgefleet_demo_v1` with no schema validation or migration.
- Any user can edit, erase, or fabricate records through developer tools.
- Storage parse failures silently fall back to defaults without reporting or recovery options.
- Several service methods expose generic `upsert` and `remove`, making it easy for UI code to bypass domain safeguards.
- Profile email updates do not enforce uniqueness.
- Vehicle and driver deletion does not comprehensively check assignments or related history.
- Dates, statuses, transitions, numeric ranges, and cross-record ownership are only partially validated.
- Audit records are seeded display data; mutations do not consistently create new audit events.
- A second command-center data object uses unrelated vehicles, drivers, work orders, counts, and notifications, so the same product shows contradictory fleet states.

## 7. Feature audit

| Feature                 | Status                                    | Findings                                                                                              |
| ----------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Sign in/out             | Working demo                              | Validation, session, role redirect, and sign-out work; security is browser-only                       |
| Registration            | Working demo                              | Role-specific validation and linked profiles; privileged codes are client-visible                     |
| Forgot password         | Intentionally partial                     | Validates input and honestly reports that no email was sent                                           |
| Role guards             | Working demo                              | Centralized redirect logic; not security                                                              |
| Administrator dashboard | Visually strong, structurally isolated    | Separate dataset, shell, navigation, user, and permanent counts                                       |
| Other role dashboards   | Partially correct                         | Manager/Admin metrics derive from core data; Mechanic/Driver metrics use hardcoded IDs                |
| Users                   | Working generic CRUD                      | Search/filter/sort/page/modal actions; preserve account-deletion safeguards                           |
| Vehicles                | Working generic CRUD                      | Missing comprehensive related-record deletion rules                                                   |
| Drivers                 | Working generic CRUD                      | Manager and Administrator actions are not differentiated clearly                                      |
| Mechanics               | Data exists, no dedicated management page | Mechanic records appear in form options and task relations                                            |
| Assignments             | Working demo                              | Conflict prevention and end-assignment updates are useful                                             |
| Maintenance             | Partially working                         | Generic CRUD exposes all records; Mechanic view is not scoped to assigned work                        |
| Mileage                 | Partially working                         | Strict create service exists; role ownership and editing rules remain incomplete                      |
| Service types           | Working generic CRUD                      | Referenced-record deletion guard exists                                                               |
| Schedules/reminders     | Working generic views                     | Multiple route/page identifiers and role presentation are inconsistent                                |
| Notifications           | Working demo                              | Read state persists, but duplicate paths and command-center hardcoding exist                          |
| Profile                 | Working demo                              | Saves local fields; needs uniqueness and stronger error handling                                      |
| Settings                | Decorative persistence                    | Preferences are saved, but no other code applies compact-table or reduced-motion selections           |
| Search                  | Working broad search                      | Admin-only user search is differentiated; other results are not ownership-scoped                      |
| Reports                 | Partially working                         | Calculated totals and safe CSV export work; charts are simplified CSS graphics and filters are absent |
| Audit log               | Read-only seeded data                     | Not generated consistently by actual mutations                                                        |
| Modal/toast             | Working                                   | Modal includes focus trap, Escape, backdrop close, and focus restoration                              |
| Responsive shell        | Implemented in CSS                        | Needs real-device/browser verification during React port                                              |

## 8. Decorative or misleading controls

- Settings checkboxes save values but do not change table density or motion elsewhere.
- The command-center “New Action” entries navigate to management pages rather than opening the named creation workflow.
- The command-center notification badge is a permanent count.
- CSS-only report and dashboard donut graphics are decorative rather than faithful data visualizations.
- Forgot-password cannot send an email; its current explanatory response is preferable to a false success claim and should remain until a backend exists.

No obvious `href="#"`, inline `onclick`, TODO/FIXME markers, empty files, or unformatted one-line source files were found.

## 9. Duplicate and tightly coupled logic

- `app.js` is approximately 750 lines and owns configuration, data selection, HTML templates, CRUD forms, dashboards, reports, notifications, profile, search, bindings, permissions, and routing decisions.
- `dashboard.js` adds another full shell and dashboard implementation rather than composing the shared components.
- Role HTML files repeat nearly identical stylesheet and script lists.
- Notifications have shared and role-specific entry documents.
- Administrator command-center records duplicate the normalized mock dataset with different IDs and totals.
- UI scripts rely on global `window.ForgeFleet*` objects and strict script order.
- Component loading relies on runtime HTML fetches and manual root-depth calculation.
- Direct DOM template injection makes ownership, escaping, accessibility, and event lifecycle difficult to reason about.

## 10. What should be preserved

### Functional requirements

- Four roles: Administrator, Manager, Mechanic, and Driver.
- Role redirect, protected navigation, and sign-out behavior.
- Registration validation and role-profile relationships, while isolating demo-only credentials.
- Searchable, filterable, sortable, paginated management tables.
- Modal create/edit and confirmed destructive actions.
- Assignment conflicts and relationship updates.
- Maintenance status, findings, work performed, notes, costs, and history.
- Mileage monotonicity and duplicate-date validation.
- Notification recipient/read state.
- Profile editing and remembered email.
- Dashboard metrics calculated from one authoritative dataset.
- Report totals and spreadsheet-safe CSV export.
- Empty states, validation feedback, loading/disabled states, and toasts.

### Visual requirements

- Dark charcoal and gold visual direction.
- Inter typography and local font assets.
- ForgeFleet hero image and login composition.
- Dense but readable command-center information hierarchy.
- Sidebar/topbar shell, cards, badges, table styling, modal, toast, profile menu, and responsive drawer.
- Focus states, reduced-motion support, and mobile table overflow.

### Assets

- `src/assets/images/forgefleet-hero.png`
- `src/assets/fonts/inter-latin-400-normal.woff2`
- `src/assets/fonts/inter-latin-600-normal.woff2`
- `src/assets/fonts/inter-latin-700-normal.woff2`
- Inter and Lucide license notices

## 11. What should not be carried forward

- Plaintext credentials or shared privileged registration codes outside an explicitly isolated demo adapter.
- Frontend route hiding described as real authorization.
- Hardcoded `MEC-001`, `DRV-001`, `VEH-001`, or a static command-center user as current-account logic.
- The duplicate `ForgeFleetDashboard` dataset.
- Duplicate shell, navigation, search, notification, and profile implementations.
- Global window namespaces and script-order dependencies.
- Repeated HTML entry documents for every route.
- Runtime-fetched HTML partials and manual `data-depth` path logic.
- Generic mutation methods exposed directly to page components.
- Settings that persist without affecting the interface.
- Decorative counts, charts, or action labels that imply unsupported behavior.
- PHP/MySQL/backend plans during the frontend rebuild.

## 12. Recommended rebuild stages

1. Establish governance and preserve this audit.
2. Preserve the static prototype and scaffold React/Vite/TypeScript with routing and validation tooling.
3. Port design tokens, shared UI components, and Auth/Dashboard layouts.
4. Define normalized TypeScript domain models and a replaceable demo service/storage adapter.
5. Implement authentication context, session-derived profiles, protected routes, and role routes.
6. Port shared and Administrator workflows using one authoritative dataset.
7. Port Manager assignments, schedules, and reporting.
8. Port Mechanic work with authenticated-profile scoping.
9. Port Driver assignment, mileage, and reminder workflows with authenticated-profile scoping.
10. Consolidate routes, remove React duplication, and complete accessibility, responsive, console, test, and build verification.

Detailed deliverables and exit criteria are in `docs/frontend-rebuild-plan.md`.

## 13. Historical audit conclusion

The static prototype provided a valuable functional specification and visual reference. The completed rebuild followed the staged approach: the prototype is archived intact, the active React application uses typed domain and service boundaries, role workflows share one shell and dataset, and current-user records are resolved through the active session and linked profiles.
