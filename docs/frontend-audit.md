# ForgeFleet frontend audit

Audit date: 2026-07-18  
Original source inspected (read-only): `C:\Users\dhanwil\OneDrive\Desktop\Im2`  
Target project: `C:\Users\dhanwil\OneDrive\Desktop\ForgeFleet`

## Scope and verification

The source path is accessible and contains `package.json`, `src/`, `public/`, `vite.config.js`, React JSX components, CSS Modules, global CSS, and a Vite entry point. It is therefore a valid React/Vite reference project. The same folder also contains PHP/MySQL migration artifacts (`*.php`, `includes/`, `database/`, role directories, and static `assets/`). Those artifacts are not part of the React/Vite visual source audited here and must not be mistaken for the requested new frontend. Nothing in the source was modified.

## 1. Original technology stack

| Area           | Finding                                                                                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework      | React 19.2.7 and React DOM 19.2.7                                                                                                                                                |
| Build tool     | Vite 8.1.3 with `@vitejs/plugin-react` 6.0.3                                                                                                                                     |
| Languages      | JavaScript ES modules, JSX, HTML5, CSS3, JSON package metadata. No TypeScript or TSX was found.                                                                                  |
| Entry flow     | `index.html` -> `src/main.jsx` -> `src/App.jsx`; React Strict Mode, `BrowserRouter`, and `UIProvider` wrap the application.                                                      |
| Routing        | React Router DOM 7.18.1 using `BrowserRouter`, nested `Routes`, `Outlet`, `Navigate`, `Link`, and `NavLink`; pages are lazy-loaded with `React.lazy`/`Suspense`.                 |
| Styling        | `src/styles/tokens.css`, `src/styles/global.css`, `src/App.module.css`, and per-component/per-page CSS Modules. No CSS framework, preprocessor, utility framework, or CSS-in-JS. |
| Icons          | `lucide-react` 1.23.0, rendered as React-generated inline SVG.                                                                                                                   |
| Charts         | Recharts 3.9.2 with responsive containers, bar, line/area, pie/donut, axes, grid, tooltip, and legend primitives.                                                                |
| Animation      | Framer Motion 12.42.2 for page entry, metric-card hover, and notification presence; CSS transitions provide other states.                                                        |
| State          | Component hooks plus `src/context/UIContext.jsx` for collapsed sidebar, mobile navigation, and transient notification state. No Redux or other store.                            |
| Fonts          | Inter through `@fontsource/inter`, weights 400, 500, 600, 700, 800, and 900.                                                                                                     |
| Storage        | No React-source use of `localStorage`, `sessionStorage`, IndexedDB, or cookies.                                                                                                  |
| Mock data      | Static exports in `src/data/fleetData.js`; placeholder route rows in `src/pages/ShellPlaceholderPage.jsx`.                                                                       |
| API calls      | No `fetch`, Axios, GraphQL, WebSocket, or REST client code found in the React source.                                                                                            |
| Authentication | Visual-only login. Submit is prevented; sign-in/reset/Google/contact actions show transient placeholder messages. No route guard.                                                |
| Authorization  | None. Navigation and routes are not role-aware.                                                                                                                                  |

Relevant dependencies are React, React DOM, React Router DOM, Recharts, Lucide React, Framer Motion, Fontsource Inter, Vite, and the Vite React plugin. The new static frontend will need native DOM equivalents, local icons/fonts, and Chart.js only where chart parity requires it.

## 2. Pages and routes

All current application-shell routes are visible to every visitor. Role labels below are migration recommendations based on the requested role set, not implemented security.

| Route                  | Source / title                               | Main UI and controls                                                                                                                | Data and status                                                                     | Recommended destination                                                                |
| ---------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `/`                    | `src/App.jsx`; redirect                      | Redirects to `/dashboard`                                                                                                           | Complete client redirect                                                            | `index.html`                                                                           |
| `/login`               | `LoginPage.jsx`; sign in                     | Hero image, logo lockup, email/password inputs, remember checkbox, forgot-password, sign-in, Google sign-in, contact-admin controls | Static; **visual only**; no validation/authentication                               | `login.html`                                                                           |
| `/dashboard`           | `DashboardPage.jsx`; Command Center          | Metric cards, hero vehicle, quick actions, four charts, work-order/mileage tables, reminders, activity, notifications               | Mock-data driven; view/navigation works; actions are placeholder notifications      | Role dashboard pages, beginning `admin/dashboard.html`                                 |
| `/vehicles`            | `VehiclesPage.jsx`; Vehicle Registry         | Search input, filter/export/add controls, vehicle cards, registry table, detail links                                               | Mock-data driven; detail navigation works; search/filter/export/add are visual only | `admin/vehicles.html`, `manager/vehicles.html`                                         |
| `/vehicles/:vehicleId` | `VehicleDetailsPage.jsx`; Vehicle Details    | Summary, health metrics, assignment panel, maintenance/mileage/reminder tables, edit/manage-assignment actions                      | Mock-data lookup works; unknown IDs show a not-found state; writes are placeholders | Admin/manager vehicle page or future shared detail page                                |
| `/drivers`             | `ShellPlaceholderPage.jsx`; Driver Directory | Generic summary cards, table, add action                                                                                            | Three route-local mock rows; **placeholder/partially complete**                     | `admin/drivers.html`, `manager/drivers.html`                                           |
| `/mileage-logs`        | `ShellPlaceholderPage.jsx`; Mileage Logs     | Generic summary cards, table, add action                                                                                            | Uses dashboard mock logs; **placeholder**                                           | `driver/mileage.html` plus authorized admin/manager view                               |
| `/service-types`       | `ShellPlaceholderPage.jsx`; Service Types    | Generic summary cards, table, add action                                                                                            | Three route-local rows; **placeholder**                                             | `admin/service-types.html`                                                             |
| `/maintenance`         | `src/App.jsx`; redirect                      | Redirects to `/maintenance-history`                                                                                                 | Complete redirect                                                                   | Appropriate role maintenance destination                                               |
| `/maintenance-history` | `MaintenancePage.jsx`; Maintenance History   | Metrics, tabs, vehicle/service filters, clear filters, history/work-order tables, empty state, work-order/optimization controls     | Tabs and filters work in React state; CRUD actions are placeholders                 | `admin/maintenance.html`, `mechanic/maintenance.html`, `mechanic/service-history.html` |
| `/reminders`           | `RemindersPage.jsx`; Reminder Console        | Reminder metrics, cards, status badges, add reminder                                                                                | Static mock data; add action is placeholder                                         | `driver/maintenance-reminders.html` and role-appropriate reminders                     |
| `/reports`             | `ReportsPage.jsx`; Executive Reports         | Highlights, fleet health/utilization/cost charts, operational summary/status, filters/download                                      | Mock-data driven charts; filters and download are placeholders                      | `admin/reports.html`, `manager/reports.html`                                           |
| `/users`               | `ShellPlaceholderPage.jsx`; User Management  | Generic summary cards, table, invite action                                                                                         | Three route-local mock users; **placeholder**                                       | `admin/users.html`                                                                     |
| `/settings`            | `ShellPlaceholderPage.jsx`; System Settings  | Generic summary cards, table, configure action                                                                                      | Three route-local mock settings; **placeholder**                                    | No planned page yet; confirm whether needed                                            |
| `*`                    | `src/App.jsx`                                | Redirects silently to dashboard                                                                                                     | No genuine 404 view                                                                 | `404.html`                                                                             |

Not present as React routes: forgot password, audit log, assignments, schedules, mechanic task dashboard, mechanic notifications, driver-specific dashboard/assigned vehicle, profile, full notifications page, global search results, and explicit error pages. There are no hidden or role-prefixed routes.

### Existing forms, tables, filters, and modals

- Forms: only the visual login form; it prevents submit and has no controlled state or validation.
- Tables: reusable `Table` is used on dashboards, vehicles, vehicle details, maintenance, and placeholder routes.
- Working filters: maintenance history vehicle and service selects, including clear/reset and an empty result state.
- Visual-only filters/search: topbar search, vehicle search/filter, report filters.
- Modals and confirmation dialogs: none found.
- Sorting and pagination: none found.

## 3. Shared React components

| Component            | Original source/style                                 | Used by                        | Behavior                                                             | Static migration destination/responsibility                               |
| -------------------- | ----------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| App shell            | `components/layout/AppShell.jsx` / module             | All authenticated-style routes | Shell grid, overlay, content outlet, notification host               | `components/sidebar.html`, `topbar.html`, loader in `component-loader.js` |
| Sidebar              | `layout/Sidebar.jsx` / module                         | Shell                          | NavLink active state, collapse toggle, mobile close, Escape handling | `components/sidebar.html`; `navigation.js`                                |
| Topbar               | `layout/Topbar.jsx` / module                          | Shell                          | Mobile/collapse menu, search, create, notification, profile controls | `components/topbar.html`; `navigation.js`/`app.js`                        |
| Profile dropdown     | `layout/ProfileDropdown.jsx` / module                 | Topbar                         | Toggle, outside-click close, placeholder menu actions                | Topbar partial; reusable dropdown controller                              |
| Breadcrumb           | `layout/Breadcrumb.jsx` / module                      | Page container                 | Route metadata and vehicle-detail hierarchy                          | Shared page-header markup; navigation metadata                            |
| Page title/container | `layout/PageTitle.jsx`, `PageContainer.jsx` / modules | Shell pages                    | Route-derived title/subtitle and outlet spacing                      | Layout CSS and component loader configuration                             |
| Page transition      | `animation/PageTransition.jsx` / module               | All bespoke pages              | Framer Motion opacity/Y entry                                        | CSS animation with reduced-motion rule                                    |
| Button               | `ui/Button.jsx` / module                              | Most pages/components          | Variants, sizes, icon-only state, disabled passthrough               | Shared `.button` classes; normal listeners                                |
| Input                | `ui/Input.jsx` / module                               | Login, vehicle search          | Label, icon, input props                                             | Shared form classes and validation utility                                |
| Card                 | `ui/Card.jsx` / module                                | Most content pages             | Optional eyebrow/title/action slots                                  | Shared `.card` component classes                                          |
| Metric card          | `ui/MetricCard.jsx` / module                          | Dashboard/details/maintenance  | Tone, icon, delta, hover animation                                   | Statistic-card classes; renderer utility                                  |
| Hero vehicle card    | `ui/HeroVehicleCard.jsx` / module                     | Dashboard                      | Vehicle facts, hero image, detail navigation                         | Dashboard page markup/renderer                                            |
| Vehicle card         | `ui/VehicleCard.jsx` / module                         | Vehicles                       | Summary, status, detail link, action trigger                         | Reusable vehicle-card renderer                                            |
| Table                | `ui/Table.jsx` / module                               | Many pages                     | Column-driven table, optional status badge rendering                 | Shared semantic table renderer/classes                                    |
| Status badge         | `ui/StatusBadge.jsx` / module                         | Tables/cards/reports           | Maps status strings to tones                                         | Shared badge classes and normalized status map                            |
| Search bar           | `ui/SearchBar.jsx` / module                           | Topbar                         | Presentational input only                                            | Topbar partial and search controller                                      |
| Notification/toast   | `ui/Notification.jsx` / module                        | App shell                      | Context-driven timed placeholder toast with animation                | `components/toast-container.html`; `toast.js`                             |
| Notification list    | `ui/NotificationList.jsx` / module                    | Dashboard                      | Read-only notification rows and badges                               | Notification list renderer                                                |
| Reminder card        | `ui/ReminderCard.jsx` / module                        | Dashboard/reminders            | Read-only level/status display                                       | Shared card renderer                                                      |
| Quick action card    | `ui/QuickActionCard.jsx` / module                     | Dashboard                      | Button invokes callback                                              | Dashboard controller                                                      |
| Activity timeline    | `ui/ActivityTimeline.jsx` / module                    | Dashboard                      | Read-only timeline                                                   | Shared timeline classes/renderer                                          |
| Stat circle          | `ui/StatCircle.jsx` / module                          | Maintenance/reminders          | Circular statistic visualization                                     | Shared statistic component classes                                        |
| Avatar               | `ui/Avatar.jsx` / module                              | Profile dropdown               | Initials from name                                                   | Topbar/profile renderer                                                   |
| Charts               | `charts/*.jsx` and two chart modules                  | Dashboard/reports              | Responsive Recharts plots and custom tooltip                         | Page chart controllers; Chart.js only if needed                           |

No reusable modal, pagination, tabs, alert, full error-state, form-select, or confirmation-dialog component exists. Maintenance tabs and selects are page-specific.

## 4. Navigation structure

Sidebar order is Dashboard, Vehicles, Drivers, Mileage Logs, Service Types, Maintenance History, Reports, Reminders, Users, and Settings. Each item supplies an icon, title, subtitle, and route in `src/data/navigation.js`. `NavLink` applies active styling; `/vehicles` also remains visually active on vehicle-detail routes. The sidebar footer contains a collapse/expand button.

The topbar contains a menu control, global search, New Maintenance Action, notifications with a dot, and a profile dropdown. The profile menu exposes Profile, Access Controls, and Sign Out, but all are placeholders. On desktop the menu control toggles the 286px/92px sidebar. At mobile width it opens an overlay drawer. Escape and overlay click close the drawer. No role filtering, nested menus, notification route, or working logout exists.

## 5. Role visibility and permissions

The React source implements no roles or permissions. The following is the requested frontend migration visibility baseline and must later be validated against business requirements. It is **display behavior only, not server security**.

| Role     | Visible pages                                                                                                           | Intended visible actions                                                                                                                     |
| -------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin    | Dashboard, users, vehicles/details, drivers, service types, maintenance, reports, audit, profile, notifications, search | View/create/edit/delete core records; search/filter; manage users and service types; export reports; read notifications; update profile      |
| Manager  | Dashboard, vehicle/driver views, assignments, schedules, reports, profile, notifications, search                        | View/search/filter vehicles and drivers; create/edit/end assignments; create/edit/status schedules; export permitted reports; update profile |
| Mechanic | Dashboard, assigned maintenance, service history, notifications, profile, search                                        | View assigned work; filter; add findings/work/notes; update progress; complete tasks after confirmation; read notifications; update profile  |
| Driver   | Dashboard, assigned vehicle, mileage, maintenance reminders, notifications/profile                                      | View own assignment; submit mileage; view history/reminders; read notifications; update profile                                              |

Approve, record ownership, delete scope, audit access, and cross-depot visibility are unverifiable. They require product-owner decisions and later server authorization.

## 6. Feature completion inventory

| Feature                | Classification                       | Evidence                                                   |
| ---------------------- | ------------------------------------ | ---------------------------------------------------------- |
| Login                  | Visual only                          | Prevented submit, placeholder toast                        |
| Logout                 | Visual only                          | Profile action shows placeholder                           |
| Forgot password        | Missing                              | Button only; no route/page                                 |
| Dashboard statistics   | Mock-data driven                     | Static constants, no calculated source                     |
| Charts                 | Mock-data driven / visually complete | Recharts renders fixed arrays responsively                 |
| Navigation             | Partially complete                   | SPA routes/collapse/mobile work; role/logout links do not  |
| Search                 | Visual only                          | Inputs have no query handler                               |
| Filters                | Partial                              | Maintenance filters work; vehicle/report filters do not    |
| Sorting/pagination     | Missing                              | No implementation found                                    |
| Modals/confirmations   | Missing                              | No modal component found                                   |
| Forms/CRUD             | Visual only or missing               | No record mutation or persistence                          |
| Notifications          | Partial/mock driven                  | Lists and transient toast; no read state/page              |
| Profile                | Missing                              | Dropdown action only                                       |
| Reports                | Partial/mock driven                  | Charts render; filters/download do not                     |
| Audit logs             | Missing                              | No route/data/component                                    |
| Mileage                | Placeholder                          | Generic table only                                         |
| Assignments            | Visual only/missing                  | Vehicle detail summary/action; no workflow/model           |
| Maintenance scheduling | Visual only                          | Quick actions/reminders; no schedule form/model            |
| Service history        | Partial/mock driven                  | History table and filters work                             |
| Error handling         | Partial                              | Vehicle not-found state exists; wildcard redirects, no 404 |

## 7. Mock data and structures

`src/data/fleetData.js` exports: `metrics`, `quickActions`, `fleetHealth`, `costByCategory`, `utilizationByDepot`, `dashboardHeroVehicle`, `fleetStats`, `vehicleStatusDistribution`, `monthlyMaintenanceCost`, `vehicles`, `vehicleMaintenanceRecords`, `vehicleMileageActivity`, `vehicleReminderRecords`, `workOrders`, `mileageLogs`, `reminders`, `activities`, `latestNotifications`, and `reportHighlights`.

Core implicit models:

- Vehicle: `id`, `name`, `type`, `depot`, `mileage`, `status`, `health`, `nextService`, `vin`, `driver`, `utilization`, `year`, `plate`.
- Maintenance record: `id`, `vehicleId`, `service`, `completed`, `odometer`, `cost`, `status`.
- Mileage activity/log: inconsistent shapes using `vehicleId` or `asset`, plus route, driver, miles, date/status.
- Reminder: vehicle-specific records use `id`, `vehicleId`, title/due/level; dashboard reminders use a separate shape with `asset` and icon.
- Work order: `id`, `asset`, `task`, `priority`, `owner`, `due`, `status`.
- Placeholder rows: drivers, service types, users, and settings are embedded in `ShellPlaceholderPage.jsx`.

Identifiers are stable display strings (`FF-`, `MR-`, `ML-`, `RM-`, `WO-`) but there are no schemas or TypeScript interfaces. Relationships are denormalized; drivers and owners are names rather than IDs. Dates, costs, mileage, percentages, and durations are frequently preformatted strings. Status values include Ready, In Service, Inspection, Critical, Completed, Open, In Progress, Scheduled, Queued, High, Normal, and other route-specific values.

Recommended later model: centralized normalized collections for roles, users, drivers, mechanics, managers, vehicles, assignments, service types, schedules, maintenance records/tasks, mileage logs, notifications, and audit logs. Use typed raw values and foreign-key-like IDs; calculate dashboard/report values from records. Stage 1 does not implement this model.

No browser-storage keys, API payloads, or session keys exist in the React source.

## 8. Asset inventory

| Asset                                | Original path                                          | Usage                                                  | Required / recommended destination                                   |
| ------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------ | -------------------------------------------------------------------- |
| ForgeFleet maintenance-bay truck PNG | `src/assets/forgefleet-hero.png`                       | Login hero and dashboard hero vehicle card             | Required later: `assets/images/forgefleet-hero.png`                  |
| Inter font files                     | Resolved from `node_modules/@fontsource/inter` imports | Global type, weights 400-900                           | Required later: licensed WOFF2 subsets in `assets/fonts/`            |
| Lucide icons                         | Generated from `lucide-react`                          | Logo, navigation, controls, metrics, charts, status UI | Export only used local SVGs to `assets/icons/`; preserve stroke/size |
| Logo                                 | ShieldCheck Lucide glyph plus ForgeFleet text          | Sidebar/login                                          | No standalone logo file exists; reconstruct from local SVG plus text |
| Avatar                               | CSS/HTML initials (`FD`)                               | Profile trigger                                        | No image required                                                    |
| Charts                               | Runtime Recharts SVG                                   | Dashboard/reports                                      | Recreate; no image asset to copy                                     |

`public/` is empty. No other React-source JPEG, WebP, standalone SVG, avatar, illustration, background image, or font file was found. The coexisting migration tree has copied image/font assets, but Stage 1 copies nothing.

## 9. Design system inventory

The canonical tokens are in `src/styles/tokens.css`; global reset/theme behavior is in `src/styles/global.css`. Component-specific exact values remain in each `*.module.css` and should be ported selectively during design extraction.

| Category   | Exact/discoverable values                                                           |
| ---------- | ----------------------------------------------------------------------------------- |
| Background | `#07090b`; secondary `#0f1215`; top-left gold radial gradient                       |
| Surfaces   | `#13171b`, `#171c21`, `#1a2026`                                                     |
| Text       | white `#ffffff`; muted `#9ca3af`; soft `#d1d5db`                                    |
| Accent     | `#d6a85a`; hover `#e6bc74`                                                          |
| Semantic   | success `#4ade80`; warning `#facc15`; danger `#ef4444`; info `#93c5fd`              |
| Borders    | white at 6% and 12% opacity; component-specific accent/semantic alpha borders       |
| Radius     | 12, 16, 20, 24px tokens; pills 999px; additional module-specific radii              |
| Shadows    | card `0 24px 70px rgba(0,0,0,.34)`; subtle `0 12px 34px rgba(0,0,0,.22)`            |
| Layout     | sidebar 286px; collapsed 92px; topbar 84px; content max 1680px                      |
| Motion     | 160ms, 220ms, 420ms `ease`; Framer page/card/toast transforms                       |
| Typography | Inter/system sans; weights 400-900; feature settings `cv02`, `cv03`, `cv04`, `cv11` |

Body copy has zero letter spacing. Metadata/eyebrows use uppercase and module-specific tracking. Small text is approximately `.70rem`-`.98rem`; large headings use responsive `clamp()` values, reaching roughly 4-6.35rem in hero contexts. Common gaps range 6-28px and cards generally use 18-30px padding. Exact page values should be taken from their source modules rather than normalized.

Breakpoints discovered: 520, 560, 640, 720, 760, 980, 1024, 1100, 1180, 1280, 1320, and 1360px, plus `prefers-reduced-motion: reduce`. Focus, hover, active, and disabled states exist across navigation, buttons, fields, cards, rows, and dropdowns. Focus styling uses gold outline/shadow treatments.

## 10. Responsive behavior

- Large/standard desktop: fixed shell sidebar, sticky 84px topbar, multi-column dashboard and report grids, content constrained to 1680px.
- At 1360/1320/1280/1180px: vehicle, dashboard, report, detail, reminder, and topbar layouts reduce columns or spacing.
- At 1100px: login changes from split layout; topbar hides/reduces secondary content.
- At 1024px: shell spacing changes and sidebar uses compact behavior.
- At 760px: sidebar becomes an overlay drawer, page grids/toolbars stack, content padding tightens, and mobile menu behavior activates.
- At 640px and below: forms/cards/details stack; titles and card padding shrink; login becomes single-column; toast width is constrained.
- Tables retain an internal horizontal scroll wrapper rather than becoming cards.
- Recharts use `ResponsiveContainer`; charts resize with their panels.
- Reduced-motion CSS suppresses page transition animation, though all motion behavior needs later verification.

## 11. React coupling and migration risks

| Risk                                             | Approach for static frontend                                                                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Router-derived shell metadata and active links   | Use `data-page`/`data-role`, a navigation map, and a shared component loader.                                                        |
| CSS Module-scoped class names                    | Convert systematically to prefixed reusable classes while preserving declarations and DOM hierarchy.                                 |
| Context-owned sidebar/toast state                | Replace with small shared DOM controllers and custom events.                                                                         |
| Hook-driven maintenance tabs/filters             | Use page-specific listeners and pure render/filter functions.                                                                        |
| Recharts SVG composition                         | Reproduce datasets, colors, axes, legends, tooltips, and responsive dimensions with Chart.js only if necessary.                      |
| Framer Motion transitions                        | Use CSS transitions/keyframes and `prefers-reduced-motion`.                                                                          |
| Lucide React icons                               | Export a minimal licensed local SVG set; avoid substituting unrelated glyphs.                                                        |
| Route-local placeholder data                     | Move to centralized mock data; do not treat placeholder rows as complete requirements.                                               |
| Formatted strings and denormalized relationships | Normalize raw values and IDs before localStorage and eventual SQL integration.                                                       |
| Missing role model                               | Confirm permission matrix before exposing destructive actions; frontend hiding is not security.                                      |
| Many inert controls                              | Track every action during interaction stages and provide a demo behavior or honest backend-required message.                         |
| Accessibility gaps                               | Add form names/autocomplete, menu keyboard handling, robust labels, modal focus management, and real 404 semantics without redesign. |
| Coexisting PHP migration files in reference      | Ignore as implementation source unless separately authorized; do not copy them into this frontend-only project.                      |

## 12. Recommended build order

1. Static scaffold and relative-path/component-loading test.
2. Exact design-system extraction from tokens, global CSS, and CSS Modules.
3. Shared sidebar/topbar/page shell, including desktop collapse and mobile drawer.
4. Centralized normalized mock data and replaceable data-service interface.
5. Login and forgot-password demonstration using the original login visuals.
6. Admin dashboard, because it exercises the broadest card/table/chart system.
7. Admin CRUD pages, starting with vehicles/details, then users, drivers, service types, maintenance, reports, audit.
8. Manager views, assignments, schedules, and reports.
9. Mechanic task workflow, service history, and notifications.
10. Driver assignment, mileage, and reminders.
11. Shared profile, notifications, search, and 404.
12. Report filter/chart/export demonstrations after normalized data exists.
13. Complete interaction and dead-control review.
14. Responsive/accessibility verification at all prescribed widths.
15. Visual regression against the React source.
16. Functional testing and frontend freeze/backend handoff.

The dependencies are deliberate: pages depend on the design system and shell; dashboards/reports depend on normalized data; role pages depend on the visibility map; and regression should occur only after interactions stabilize.

## 13. PHP/MySQL integration preview

Future backend work will require, at minimum:

- PHP sessions, login/logout handlers, password-reset delivery, CSRF protection, and server route guards.
- MySQL tables for roles, users, profiles, drivers, mechanics, managers, vehicles, vehicle assignments, service types, maintenance schedules, maintenance records/tasks, parts if retained, mileage logs, notifications/read state, and audit logs.
- Server validation for every create/update action, typed dates/numbers/currency, unique email/plate/VIN constraints, assignment conflicts, monotonic mileage, and valid status transitions.
- Server authorization for role, ownership/assignment, depot scope, record-level edit/delete/complete/export, and audit visibility.
- Stable database IDs and foreign keys replacing display-name relationships.
- Aggregate queries for dashboard metrics, report charts, filtered totals, maintenance cost, utilization, readiness, overdue work, and counts.
- Notification persistence and read timestamps; audit events for authentication and record mutation.
- Safe CSV/report generation and download headers; spreadsheet-formula neutralization.
- File handling only if profile images or attachments are later approved; none is required by the React source.
- Email delivery only for approved password-reset/notification workflows.

No backend code is created in this stage.

## 14. Missing, inaccessible, or unverifiable information

- No TypeScript interfaces, API contract, backend contract, tests, Storybook, or React error boundary exists.
- The React source contains no confirmed Admin/Manager/Mechanic/Driver permission matrix.
- Required role-specific pages are mostly absent, so their exact original layouts cannot be visually copied.
- Forgot password, profile, full notifications, shared search results, audit logs, assignments, schedules, and real 404/error pages are absent.
- Drivers, mileage, service types, users, and settings are generic placeholders, not full workflows.
- There are no modals, confirmation dialogs, pagination, sorting, CRUD persistence, exports, or file upload behavior to inspect.
- `public/` is empty; there is no standalone logo asset and no standalone SVG icon set.
- Business rules for assignment conflicts, maintenance completion/approval, mileage ownership, delete scope, report visibility, and status transitions are unclear.
- Dates/currency/mileage are presentation strings, and mock datasets contain inconsistent field names and parallel representations.
- The reference folder's PHP/MySQL artifacts indicate a separate migration effort, but they do not establish the intended frontend-only requirements and were not modified.

## Audit conclusion

The reference is a polished dark/gold React/Vite prototype with seven substantive views: login, dashboard, vehicles, vehicle details, maintenance history, reminders, and reports. Its strongest reusable assets are the responsive application shell, page header system, cards, tables, status badges, input/button primitives, chart components, notifications, and responsive CSS Modules. Most business behavior is static or placeholder-driven; there is no real authentication, role enforcement, persistence, CRUD, API, or backend.

The recommended next stage is **Stage 2: static frontend scaffold**, only after this audit is reviewed. Stage 2 should create the agreed HTML/CSS/JavaScript directory structure and component-loading test without filling pages with final layouts.
