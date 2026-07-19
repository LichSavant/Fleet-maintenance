# ForgeFleet React frontend

This directory contains the active ForgeFleet application. It is a React 19, Vite 8, and strict TypeScript frontend with React Router, accessible reusable components, plain CSS, and centralized browser-persisted demonstration services.

## Requirements and installation

- Node.js `^20.19.0` or `>=22.12.0`
- npm

```bash
npm install
npm run dev
```

## Commands

| Command                | Purpose                                               |
| ---------------------- | ----------------------------------------------------- |
| `npm run dev`          | Start the Vite development server                     |
| `npm run format`       | Check Prettier formatting                             |
| `npm run format:write` | Apply Prettier formatting                             |
| `npm run lint`         | Run ESLint                                            |
| `npm run typecheck`    | Run strict TypeScript checking without emitting files |
| `npm run test`         | Run the Vitest suite                                  |
| `npm run build`        | Type-check and build production assets                |
| `npm run preview`      | Serve the production build locally                    |

## Mock accounts

| Role          | Email                      | Password      |
| ------------- | -------------------------- | ------------- |
| Administrator | `admin@forgefleet.demo`    | `admin123`    |
| Manager       | `manager@forgefleet.demo`  | `manager123`  |
| Mechanic      | `mechanic@forgefleet.demo` | `mechanic123` |
| Driver        | `driver@forgefleet.demo`   | `driver123`   |

Credentials live only in `src/data/mockAccounts.ts`. Driver and Mechanic self-registration creates both the browser credential and its linked operational profile. Privileged self-registration remains disabled.

## Routes

Public and authentication:

- `/` — landing page
- `/sign-in` — development sign in
- `/sign-up` — Driver and Mechanic self-registration
- `/forgot-password` — frontend-only recovery demonstration

Dashboards:

- `/admin/dashboard`
- `/manager/dashboard`
- `/mechanic/dashboard`
- `/driver/dashboard`

Management and operations:

- `/management/users` — Administrator only
- `/management/drivers`, `/management/mechanics`, `/management/vehicles` — Administrator and Manager
- `/operations/assignments` — Administrator and Manager
- `/maintenance/schedules` — Administrator and Manager
- `/maintenance/work-orders` — Administrator, Manager, and assigned Mechanic behavior
- `/maintenance/history` — role-filtered history
- `/maintenance/service-types` — Administrator management with Manager visibility
- `/driver/maintenance`, `/driver/mileage` — Driver only
- `/reports` — Administrator and Manager
- `/notifications`, `/profile` — all authenticated roles

Unknown routes render the not-found screen. Signed-out and cross-role requests are redirected through typed route guards.

## Architecture

- `src/data/mockFleetData.ts` is the normalized seed data source.
- `src/services/fleetDataService.ts` is the only fleet persistence and mutation boundary.
- View services derive dashboard, management, operations, shared-account, and report models.
- `AuthContext` owns the active session. Pages and components do not read browser storage directly.
- Role profiles and current assignments are resolved from the authenticated user ID; the UI never assumes a seeded current driver, mechanic, or vehicle.
- `DashboardLayout` is shared by all authenticated roles and receives typed role navigation.

## Data integrity rules

- Driver and vehicle assignments cannot conflict.
- Assignment and maintenance dates are validated.
- Work-order transitions follow the allowed state graph.
- Historical assignments and completed service remain linked and visible.
- Deactivation is blocked when active relationships would be broken.
- Mileage must belong to the signed-in driver's active vehicle and cannot lower the odometer.
- Notifications are generated from linked assignment, schedule, work-order, completion, reminder, and mileage actions.

## Accessibility and responsive behavior

Inputs have programmatic labels, errors use described relationships, icon-only buttons have accessible names, statuses include text, focus styles are visible, and dialogs trap focus, close with Escape, and restore focus. The mobile navigation drawer also traps focus and restores it to its opener. Tables use captions and contained horizontal scrolling.

The shared shell is designed for approximately 360px, 768px, 1024px, and 1440px widths. Sidebars scroll vertically when necessary; forms and cards stack at mobile widths; modals constrain their height and scroll their bodies.

## Frontend-only limitations

This application does not provide secure authentication or server authorization. Browser records can be inspected or modified by the user, data is not synchronized across devices, and concurrent edits are unsupported. Password changes, email delivery, server audit logs, real-time notifications, and production reports remain backend work. Profile contact-email changes do not change seeded development login credentials.

The archived static prototype is in `../legacy-static/` and is not imported by this application.
