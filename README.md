# ForgeFleet frontend prototype

ForgeFleet is a pure HTML5, CSS3, and vanilla JavaScript demonstration of a fleet maintenance log system. It preserves the original React/Vite prototype's dark charcoal, gold-accented visual language while keeping business data behind a replaceable frontend data service.

## Run locally

Open this folder in VS Code, install/enable **Live Server**, and choose **Open with Live Server** on `index.html`. Use the resulting `http://127.0.0.1:...` URL. Do not open pages with `file://`: shared sidebar, topbar, footer, modal, and toast partials are fetched by JavaScript and browsers normally block those fetches for local files.

## Demo accounts

| Role     | Email                      | Password      |
| -------- | -------------------------- | ------------- |
| Admin    | `admin@forgefleet.demo`    | `admin123`    |
| Manager  | `manager@forgefleet.demo`  | `manager123`  |
| Mechanic | `mechanic@forgefleet.demo` | `mechanic123` |
| Driver   | `driver@forgefleet.demo`   | `driver123`   |

## Sign In and Sign Up

Use `signup.html` to create a browser-local Driver, Mechanic, Manager, or Admin demonstration account. Driver and Mechanic registration is open for the demo. Manager registration requires `MANAGER2026`; Admin registration requires `ADMIN2026`. These codes and all local passwords are visible frontend demonstration values, not security controls. Role-specific fields are stored in the account profile, while registration codes are discarded.

Sign In looks up the stored account, determines its role, records a temporary `sessionStorage` session, and redirects to that role's dashboard. “Remember my email” stores only the email reference in localStorage. Protected pages simulate role guards and redirect cross-role navigation to the signed-in user's own dashboard.

Authentication is a navigation demonstration using `sessionStorage`; it is not security. Default records are copied from `src/services/mockData.js` into `localStorage` under `forgefleet_demo_v1`. Use **Reset demo data** in the sidebar to restore defaults.

## Architecture

- Root pages: sign-in, recovery, 404, design-system and layout references.
- Role folders: Admin, Manager, Mechanic, and Driver interfaces.
- `shared/`: profile, notifications, and role-aware search.
- `src/assets/`: local images, fonts, and third-party license notices.
- `src/components/`: fetched layout and UI partials.
- `src/services/`: authentication, browser storage, mock data, and the replaceable CRUD boundary.
- `src/scripts/`: shared page renderers, navigation, component loading, and page controllers.
- `src/styles/`: tokens, reset, global, layout, components, utilities, responsive, and page styles.
- `src/utils/`: small shared validation and escaping helpers.

The prototype includes calculated dashboards, searchable/filterable/sortable/paginated management tables, modal CRUD, assignment conflict checks, maintenance updates, mileage records, profile changes, notification read state, role navigation, responsive menus, report visuals, and safe CSV output.

## Limitations and handoff

There is no PHP, MySQL, API, server authentication, email delivery, file upload, or live notification/report source. Browser data is temporary and can be edited by the user. The next phase may replace `data-service.js` with PHP-backed requests while preserving approved pages and component interfaces. See `docs/backend-handoff-map.md`.
