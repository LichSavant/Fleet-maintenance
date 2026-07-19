# ForgeFleet

ForgeFleet is a frontend-only fleet-maintenance application for administrators, managers, mechanics, and drivers. The active application is the React, Vite, and TypeScript project in [`frontend/`](frontend/). The original static prototype is archived in [`legacy-static/`](legacy-static/) and is not the active application.

## Requirements

- Node.js `^20.19.0` or `>=22.12.0`
- npm
- A modern browser with JavaScript and browser storage enabled

## Install and run

```bash
cd frontend
npm install
npm run dev
```

Vite prints the local development URL. Production validation and preview use:

```bash
npm run format
npm run lint
npm run typecheck
npm run test
npm run build
npm run preview
```

## Development accounts

These credentials are browser-visible demonstration values, not secrets.

| Role          | Email                      | Password      |
| ------------- | -------------------------- | ------------- |
| Administrator | `admin@forgefleet.demo`    | `admin123`    |
| Manager       | `manager@forgefleet.demo`  | `manager123`  |
| Mechanic      | `mechanic@forgefleet.demo` | `mechanic123` |
| Driver        | `driver@forgefleet.demo`   | `driver123`   |

Driver and Mechanic self-registration is available in the demonstration. It creates a linked fleet user and role profile. Administrator and Manager self-registration is intentionally unavailable until a provisioned backend workflow exists.

## Project structure

```text
ForgeFleet/
├── frontend/                 Active React application
│   ├── src/
│   │   ├── components/       Reusable common, layout, and UI components
│   │   ├── context/          Authentication state
│   │   ├── data/             Centralized development records
│   │   ├── hooks/            Shared React hooks
│   │   ├── layouts/          Public, authentication, and dashboard shells
│   │   ├── pages/            Routed application screens
│   │   ├── routes/           Route configuration and role guards
│   │   ├── services/         Authentication, persistence, views, and reports
│   │   ├── styles/           Tokens and shared responsive styles
│   │   ├── types/            Shared TypeScript domain types
│   │   └── utils/            Formatting and validation helpers
│   └── README.md
├── legacy-static/            Archived HTML/CSS/JavaScript prototype
├── docs/                     Audit, rebuild, and handoff documentation
└── AGENTS.md                 Contributor rules
```

## Role behavior

- **Administrator:** fleet-wide dashboard, users, drivers, mechanics, vehicles, assignments, maintenance, service types, history, and reports.
- **Manager:** operational dashboard, drivers, mechanics, vehicles, assignments, schedules, work orders, service history, service-type visibility, and reports.
- **Mechanic:** assigned-work dashboard, permitted work-order transitions, service notes, completion, and relevant history.
- **Driver:** assigned-vehicle dashboard, mileage, maintenance reminders and status, and relevant service history.
- **All authenticated roles:** notifications, profile details, session restoration, and sign out.

Routes are protected in the React UI and service workflows resolve records from the active session user ID. This is demonstration authorization only.

## Frontend-only limitations and known issues

- Authentication, role guards, records, and sessions are stored in browser-accessible storage and are not secure.
- Data is local to the browser profile and is not synchronized across devices. Same-tab updates are live; cross-tab synchronization is not implemented.
- Profile contact-email edits do not replace the documented development login credential.
- Password changes, password-recovery delivery, server audit logs, real-time notifications, and multi-user concurrency require a backend.
- Reports are browser-calculated snapshots of mock records, not server-generated or real-time reports.
- The project does not provide a backend, API, database, email service, or production deployment configuration.

## Planned backend integration

The typed services in `frontend/src/services/` are the replacement boundary for a future API. Backend work must provide secure identity and session handling, server-side role authorization, persistent relational records, validation and conflict handling, audit events, notification delivery, report queries, password workflows, and API error contracts. Browser persistence should then be replaced without moving data-access logic into pages.

See [`docs/frontend-audit.md`](docs/frontend-audit.md), [`docs/frontend-rebuild-plan.md`](docs/frontend-rebuild-plan.md), and [`frontend/README.md`](frontend/README.md) for implementation detail.
