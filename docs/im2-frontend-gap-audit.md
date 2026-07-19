# IM2 Frontend Gap Audit

## Audit scope

This audit compares the active React/Vite/TypeScript application in `frontend/` with the documented Information Management 2 Fleet Maintenance Log requirements supplied for this stage. It is a static implementation audit plus the repository's automated validation suite. No application functionality was changed.

Inspected areas:

- `frontend/src/types`
- `frontend/src/data`
- `frontend/src/services`
- `frontend/src/context`
- `frontend/src/routes`
- `frontend/src/pages`
- `frontend/src/components`
- `frontend/src/utils`
- `frontend/src/styles`
- `frontend/package.json`
- all nine `*.test.ts` and `*.test.tsx` files under `frontend/src`

The archived `legacy-static/` application was not used as an implementation source. A repository search found no active frontend import from it; the only reference is the archival notice in `frontend/README.md`.

## Executive conclusion

The frontend is a coherent, tested browser-storage demonstration of vehicle, driver, assignment, work-order, mileage, notification, report, and role workflows. It is **not yet aligned with the paper's core mileage-based maintenance model**.

The blocking domain gap is structural:

1. `ServiceType` has no mileage interval.
2. Completed maintenance records have no service odometer.
3. No code calculates `nextServiceMileage`.
4. No code compares a vehicle odometer with a service threshold.
5. `Due soon`, `Due now`, and `Overdue` are not mileage-derived states.
6. Maintenance scheduling and reminders instead use `dueDate` and `scheduledDate`.

The app can therefore demonstrate operational maintenance work, but it cannot yet demonstrate the IM2 Fleet Maintenance Log's required preventive-maintenance calculation.

## Status legend

- **Implemented**: the requirement is present and materially correct for a frontend-only demonstration.
- **Partial**: useful behavior exists, but an important acceptance condition is absent or inconsistent.
- **Missing**: the required domain behavior is not implemented.
- **Contradictory**: the current implementation uses a different rule from the documented system.

## Capability matrix

| # | Required capability | Status | Evidence and exact gap |
|---|---|---|---|
| 1 | Vehicle inventory management | Partial | `VehiclesPage.tsx`, `VehicleFormModal.tsx`, `fleetDataService.ts`, and `managementViewService.ts` provide list, search, filters, sorting, pagination, view, create, edit, and out-of-service deactivation. Fleet number and plate uniqueness are checked. However, service-layer mutations accept no actor and perform no authorization; vehicle mileage can be edited downward or independently of the mileage log; and the “next service” field is a calendar date derived from schedules rather than mileage. |
| 2 | Driver directory | Partial | `DriversPage.tsx` supports search, account/assignment filters, sorting, view, add, edit, and deactivation. Driver user and profile records are created together and linked by IDs. However, management mutations do not authorize an actor, and an administrator/manager-created fleet user is not added to the separate authentication account store, so the new “account” cannot actually sign in. |
| 3 | Driver-to-vehicle assignment | Implemented | `createAssignment` validates actor role, start date, active/available driver, active vehicle, and conflicts for either side. `endAssignment` retains history and restores driver availability. The page exposes search/status filtering and functional create/end actions. |
| 4 | Manual odometer logging | Partial | `DriverMileagePage.tsx` and `submitMileage` associate a reading with the signed-in driver's linked profile and active vehicle, reject lower readings and invalid dates, add history, update the vehicle odometer, and emit activity/notification records. However, `updateVehicle` can bypass this history and lower or replace the odometer, the service does not require an integer, and mileage submission does not trigger service-due recalculation because no such model exists. |
| 5 | Maintenance-history recording | Partial | Completed work orders are the single read-only source used by `ServiceHistoryPage.tsx`; completion requires service notes and records the completion date. The record does not capture odometer-at-service, so it cannot anchor mileage intervals or prove when the next service is due. Driver history is limited to the currently assigned vehicle, not all vehicles historically assigned to that driver. |
| 6 | Service-type definitions | Partial | `ServiceTypesPage.tsx` and admin-only service mutations support searchable create, edit, and deactivate behavior with name/description validation. `ServiceType` has no interval distance, unit, or other mileage policy, so the definition is insufficient for the IM2 maintenance calculation. Service-type mutations are also absent from the audit activity log. |
| 7 | Mileage-based service intervals | Missing | No type, form, mock record, service, view, report, or test contains a service interval in kilometres/miles. |
| 8 | Automatic next-service mileage calculation | Missing | There is no formula such as `lastServiceMileage + intervalMileage`, no stored or derived next-service mileage, and no recalculation after service completion or odometer submission. `nextServiceDate` in `managementViewService.ts` is date-based and is not an equivalent. |
| 9 | Due-soon, due-now, and overdue status calculation | Contradictory | `ScheduleStatus` only contains `Upcoming`, `Overdue`, `Converted`, and `Cancelled`. Status is assigned once by comparing `dueDate` with the current date when a schedule is created. There is no mileage threshold or due-soon tolerance and no due-now state. Stored statuses are not recomputed when data is read or time advances. The seed even marks a 2026-07-20 schedule overdue while the audit date is 2026-07-19. |
| 10 | Role-based access for four roles | Partial | `AppRoutes.tsx`, `ProtectedRoute.tsx`, `RoleRoute.tsx`, typed role navigation, session restoration, and current-user dashboard views provide good route-level separation for administrator, manager, mechanic, and driver. Operational and shared mutations generally check actor roles. In contrast, user/driver/mechanic/vehicle create and update operations, and vehicle deactivation, accept no actor and have no service-layer permission check. The service lets managers transition work orders while the UI only exposes start/complete to mechanics and administrators. Authorization remains client-side only by design. |
| 11 | Search and filtering | Partial | Users, drivers, mechanics, vehicles, assignments, schedules, work orders, service history, and service types have local search; most also have useful filters or sorting. Reports have no filters, only vehicles paginate, and there is no search/filter coverage for audit events. This is adequate for the small demo data but not complete across the required information-management views. |
| 12 | Data-derived reports | Partial | `reportService.ts` derives vehicle status, maintenance status, assignment status, user role, and mileage cards from the centralized snapshot rather than static dashboard totals. The “Recorded reading total” incorrectly sums cumulative odometer readings as if they were additive distance, “Vehicles with readings” counts every vehicle, and there is no mileage-based due/overdue report. |
| 13 | Audit logging | Partial | `SystemActivity` and `logActivity` record actor, action, entity label, and timestamp for assignment create/end, schedule create/cancel, work-order create/assign/status changes, mileage submission, and profile update. Missing events include user/profile create/update/deactivate, vehicle create/update/deactivate, service-type create/update/deactivate, service-note-only edits, authentication events, and notification read changes. No dedicated searchable audit-log page exists, and tests do not assert activity creation. |
| 14 | Input validation | Partial | The app validates required fields, email/password rules, matching passwords, duplicate email/license/fleet number/plate, vehicle year/non-negative mileage, assignment conflicts, maintenance transitions, service notes on completion, and odometer/date ordering. Gaps: `Date.parse` can normalize impossible calendar dates; service-layer vehicle numbers are not checked with `Number.isFinite`; vehicle editing can lower odometer history; notes/text have no length constraints; and no interval/next-service/due-status inputs exist to validate. |
| 15 | Relationship and referential-integrity protection | Partial | Driver/mechanic profiles are deliberately linked to users; assignment and maintenance creates resolve referenced records; destructive behavior uses deactivation; active assignments/open work block related deactivation; schedule-to-work-order conversion is one-to-one; historical work is preserved. Gaps: stored browser data is only checked for array shape, not foreign-key validity; auth accounts and fleet users are separate stores that can drift; vehicle odometer and mileage submissions are duplicate mutable representations; and direct localStorage modification can introduce orphaned or malformed relationships. |
| 16 | Notifications from meaningful fleet events | Partial | Notifications are generated for new assignment, schedule creation, work-order assignment, maintenance completion, and mileage submission and are scoped to the active user/role when read. Missing event coverage includes assignment end, schedule cancellation, work-order cancellation/start, and work-order creation when a mechanic is selected at creation. Schedule reminders are calendar-text based, not mileage-status based. |

## Correctly implemented foundations worth preserving

- Typed shared fleet entities and linked IDs in `types/fleet.ts`.
- One fleet-data persistence service for domain records; pages do not access browser storage directly.
- Session-derived driver/mechanic dashboards and operations views rather than a hardcoded current profile.
- Atomic in-memory creation of a fleet user with its driver/mechanic/manager profile before persistence.
- Conflict prevention for active driver/vehicle assignments.
- Validated, role-aware work-order state transitions.
- Completed work orders as the authoritative service-history view rather than a copied history collection.
- Data-derived report categories rather than fixed summary numbers.
- Notification ownership checks and functional mark-one/mark-all behavior.
- Route guards and typed role navigation for all four required roles.
- Search, filters, empty/loading/error states, confirmation dialogs, and accessible table/form primitives.

## Paper contradictions and scope findings

### Calendar maintenance replaces the required mileage model

The following implementation is contrary to “mileage-based tracking only”:

- `MaintenanceSchedule.dueDate`
- `MaintenanceRecord.scheduledDate`
- `ScheduleStatus` based on date comparison
- “Upcoming maintenance” dashboard lists sorted by dates
- driver reminders that display a date
- vehicle “next service” rendered from the earliest schedule date
- annual safety inspection and other calendar-oriented seed schedules

There is no background timer, cron job, or automatic calendar scheduler, so the frontend does **not** automatically wake up and issue date reminders. Nevertheless, the stored model and visible maintenance-due logic are calendar-based and therefore do not match the paper.

### Out-of-scope terminology in demo data

- A service-type description refers to “telematics sensors.” No telematics data collection is implemented, but the wording conflicts with the documented scope.
- A seeded notification says a “parts request” was updated. There is no parts inventory module, but this fixture suggests an excluded workflow.
- Vehicles contain a hardcoded `health` number with no defined derivation. It is not used as AI predictive diagnostics, but the unexplained score should not be presented as predictive system output.

No implementation was found for GPS, live telematics, parts inventory, payments, accounting integration, or AI diagnostics.

## Hardcoded demonstration records

Hardcoded seed data is centralized rather than scattered through pages:

- `data/mockAccounts.ts`: four development credentials and account IDs.
- `data/mockFleetData.ts`: users, role profiles, vehicles, assignments, service types, work orders, date schedules, mileage submissions, notifications, and system activity.

These records are appropriate as clearly labelled frontend demo fixtures. Tests also intentionally reference their stable IDs. Production page and service logic does not hardcode `DRV-001`, `MEC-001`, `VEH-001`, or another seeded record as the current account.

## Current-user association findings

Correct:

- `AuthContext` restores a session only when the linked fleet user exists and is active.
- mechanic work is filtered through the mechanic profile linked to the authenticated user ID.
- driver assignment, vehicle, mileage history, maintenance view, and notifications are resolved from the authenticated user ID.
- mileage writes use the authenticated driver's linked profile and active assignment.

Gaps:

- Driver service history follows only the driver's current vehicle. Historical service relevant to previously assigned vehicles disappears from that driver's view.
- Manager dashboards resolve the signed-in manager profile but do not use its depot to scope records; every manager sees the same global fleet.
- Fleet management can create a driver/mechanic “account” without creating a corresponding authentication credential, so current-user flows cannot be tested with that new record.
- Updating a fleet/profile email does not update the underlying registered/development auth account. After sign-out, the old authentication email may still be required.

## Duplicate state and sources of truth

1. **Authentication users versus fleet users:** auth accounts live under separate auth storage keys while fleet users live inside `forgefleet.frontend.fleet-data.v2`. The context attempts to synchronize display fields at sign-in, but creation and email updates are not fully synchronized.
2. **Vehicle mileage versus mileage submissions:** `Vehicle.mileage` and the latest `MileageSubmission.mileage` both represent the odometer. `submitMileage` updates both, but `updateVehicle` can change only the vehicle value and create divergence.
3. **Stored schedule status versus source date:** `MaintenanceSchedule.status` duplicates a conclusion derivable from `dueDate`, but it is set only on creation and can become stale.

Maintenance schedules and work orders are separate linked concepts and are not themselves an unnecessary duplicate. Completed service history is correctly derived from work orders instead of copied into another collection.

## Controls, routes, and placeholders

- Static inspection found no visible button without an `onClick`, form submit, or navigation behavior.
- No `href="#"`, `TODO`, `FIXME`, browser alert, or temporary console-log control was found in active pages/components.
- All typed sidebar destinations resolve to real pages, and the route test suite exercises every role's navigation targets.
- No active business route leads to a placeholder page.
- Forgot-password remains an explicitly frontend-only demonstration, and password change is labelled unavailable until backend integration; neither is presented as a working secure backend feature.

## Referential-integrity risk details

No normal UI operation physically deletes users, profiles, vehicles, assignments, schedules, work orders, or service types, which prevents many orphan cases. The strongest existing protections are active-assignment/open-work deactivation checks and schedule/work-order link validation.

Remaining risks:

- `isStoredFleetData` validates collection presence but not record fields or foreign keys. A parseable, manually edited localStorage object can contain missing users, profiles, vehicles, service types, or invalid links.
- Management mutations are not actor-authorized at the service boundary.
- A vehicle can be put out of service while future schedules remain active; this is not an orphan because the vehicle is preserved, but the operational state can be inconsistent.
- A service type can be deactivated while open schedules use it. History is deliberately preserved, but the application needs an explicit policy for pending, not-yet-converted schedules.
- Cross-store auth/fleet writes are not transactional.

## Test coverage assessment

The existing 53 tests cover:

- development sign-in, self-registration policy, and malformed sessions;
- route guards, cross-role access, navigation destinations, and sign-out;
- linked driver/mechanic creation and duplicate validation;
- deactivation relationship checks;
- assignment conflicts and historical assignment retention;
- schedule-to-work-order linkage and work-order state transitions;
- mechanic/driver current-user association;
- mileage association, lower-reading/date rejection, and no-assignment rejection;
- meaningful notification generation and ownership;
- data-derived report section totals;
- modal and mobile-drawer keyboard behavior.

Important missing tests mirror the implementation gaps:

- service interval validation;
- next-service mileage calculation and recalculation;
- due-soon/due-now/overdue mileage boundaries;
- odometer-at-service capture;
- vehicle-edit protection against lowering/bypassing mileage history;
- audit-event coverage for every mutation;
- service-layer authorization for management mutations;
- malformed foreign-key recovery;
- auth/fleet account synchronization;
- semantic correctness of mileage report totals.

## Validation results

Commands were run from `frontend/` on the required `frontend-rebuild` branch on 2026-07-19.

| Command | Result |
|---|---|
| `npm run lint` | Passed; ESLint exited 0 with no reported violations. |
| `npm run typecheck` | Passed; `tsc --noEmit` exited 0. |
| `npm run test` | Passed; Vitest reported 9 test files passed and 53 tests passed. |
| `npm run build` | Passed; the script reran type checking, Vite transformed 118 modules, and production output was generated successfully. |

Passing validation confirms that the existing implementation is internally consistent with its tests. It does not establish acceptance of the missing mileage-based requirements.

## Recommended implementation order (not implemented in this stage)

1. Extend service types with a validated positive mileage interval.
2. Capture vehicle odometer on completed maintenance records.
3. Define one derived next-service-mileage calculation from the latest qualifying completed service plus the service interval.
4. Define exact mileage boundaries for due soon, due now, and overdue, including a documented due-soon tolerance.
5. Recalculate statuses from current records instead of storing stale derived status.
6. Replace calendar-due UI/report/reminder logic with mileage values while retaining dates only as record timestamps, if the paper permits them.
7. Close management service authorization, audit, odometer, and auth/fleet synchronization gaps.
8. Add boundary and integrity tests before changing dashboards and reports.
