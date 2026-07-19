# IM2 Frontend Acceptance Checklist

This checklist is intentionally left unchecked for formal acceptance testing. The `Status` line records the current audit result, not a completed sign-off. Tests should begin from reset mock data and use the signed-in account named by each item.

## Required capabilities

- [ ] Vehicle inventory management
  - Expected behavior: An authorized administrator or manager can list, search, filter, sort, view, create, edit, and deactivate vehicles; identifiers remain unique; odometer history cannot be lowered or bypassed; all mutations enforce permission and create audit events.
  - Relevant files: `frontend/src/pages/shared/VehiclesPage.tsx`, `frontend/src/components/common/VehicleFormModal.tsx`, `frontend/src/services/fleetDataService.ts`, `frontend/src/services/managementViewService.ts`, `frontend/src/types/fleet.ts`, `frontend/src/types/management.ts`
  - Manual test: Sign in as administrator and manager, exercise every vehicle action including duplicate plate/fleet number and linked-record deactivation; then verify a driver/mechanic is denied and verify odometer/audit history remains consistent.
  - Status: Partial — UI CRUD exists, but management service authorization, complete audit coverage, and odometer consistency are missing.

- [ ] Driver directory
  - Expected behavior: Authorized roles can search, filter, sort, view, create, edit, and deactivate linked driver accounts/profiles without producing a profile-less user or a user-less profile; a created account follows the documented sign-in/provisioning policy.
  - Relevant files: `frontend/src/pages/shared/DriversPage.tsx`, `frontend/src/components/common/AccountFormModal.tsx`, `frontend/src/services/fleetDataService.ts`, `frontend/src/services/managementViewService.ts`, `frontend/src/types/fleet.ts`
  - Manual test: Create a driver, confirm both records share the correct user ID, test duplicates and deactivation with/without an active assignment, then verify the new account's documented authentication behavior.
  - Status: Partial — directory and linked profile behavior work, but service authorization and authentication-account provisioning are inconsistent.

- [ ] Driver-to-vehicle assignment
  - Expected behavior: An administrator or manager can assign one eligible driver to one available vehicle, cannot create overlapping active assignments on either side, can end an assignment with a valid date, and can still view historical assignments.
  - Relevant files: `frontend/src/pages/shared/AssignmentsPage.tsx`, `frontend/src/components/common/AssignmentFormModal.tsx`, `frontend/src/services/fleetDataService.ts`, `frontend/src/services/operationsViewService.ts`, `frontend/src/types/operations.ts`
  - Manual test: Create a valid assignment; repeat with the same driver and with the same vehicle; try inactive/unavailable records and invalid dates; end the valid assignment and confirm history and driver availability.
  - Status: Implemented for the frontend demonstration.

- [ ] Manual odometer logging
  - Expected behavior: The signed-in driver submits a manual reading for the currently assigned vehicle; the entry records driver, vehicle, date, notes, and reading; lower/out-of-order readings fail; no alternate edit path can invalidate the log.
  - Relevant files: `frontend/src/pages/driver/DriverMileagePage.tsx`, `frontend/src/services/fleetDataService.ts`, `frontend/src/services/sharedViewService.ts`, `frontend/src/types/fleet.ts`, `frontend/src/types/shared.ts`
  - Manual test: Sign in as two different drivers, submit valid readings, try a lower value, old/future date, no active assignment, decimal/non-finite value, and a vehicle edit that lowers the odometer; verify association and history after refresh.
  - Status: Partial — current-user submission is correct, but vehicle editing can bypass/lower the duplicate odometer state and integer validation is absent.

- [ ] Maintenance-history recording
  - Expected behavior: Completing a work order records service type, vehicle, mechanic, completion date, service notes, and odometer-at-service; history remains read-only, linked, searchable, and visible according to role.
  - Relevant files: `frontend/src/pages/shared/WorkOrdersPage.tsx`, `frontend/src/pages/shared/ServiceHistoryPage.tsx`, `frontend/src/services/fleetDataService.ts`, `frontend/src/services/operationsViewService.ts`, `frontend/src/types/fleet.ts`
  - Manual test: Complete assigned work with and without required notes/odometer, refresh, search history, inspect links, and compare administrator, manager, mechanic, and driver visibility including a driver's previously assigned vehicle.
  - Status: Partial — service completion/history work, but odometer-at-service is absent and driver history is restricted to the current vehicle.

- [ ] Service-type definitions
  - Expected behavior: An administrator can create, edit, search, and deactivate a unique service type with a required positive mileage interval; linked historical records remain readable; unauthorized roles cannot mutate it.
  - Relevant files: `frontend/src/pages/shared/ServiceTypesPage.tsx`, `frontend/src/components/common/ServiceTypeFormModal.tsx`, `frontend/src/services/fleetDataService.ts`, `frontend/src/types/fleet.ts`, `frontend/src/types/operations.ts`
  - Manual test: Create/edit/deactivate a service type, test duplicate name and invalid intervals, use it in maintenance, verify linked history after deactivation, and attempt mutations as every role.
  - Status: Partial — name/description CRUD exists, but mileage intervals and audit events do not.

- [ ] Mileage-based service intervals
  - Expected behavior: Every interval-based service definition stores a validated distance in the chosen system unit and the value is used consistently by maintenance calculations, forms, reports, and notifications.
  - Relevant files: `frontend/src/types/fleet.ts`, `frontend/src/types/operations.ts`, `frontend/src/components/common/ServiceTypeFormModal.tsx`, `frontend/src/services/fleetDataService.ts`
  - Manual test: Create services with valid, zero, negative, fractional, and missing intervals; reload data and confirm valid intervals drive calculations without a calendar-due dependency.
  - Status: Missing.

- [ ] Automatic next-service mileage calculation
  - Expected behavior: For each vehicle/service pair, next service mileage is derived from the latest qualifying completed-service odometer plus the service interval and automatically updates after service completion or a corrected source record.
  - Relevant files: `frontend/src/types/fleet.ts`, `frontend/src/services/fleetDataService.ts`, `frontend/src/services/operationsViewService.ts`, `frontend/src/services/managementViewService.ts`, `frontend/src/services/reportService.ts`
  - Manual test: Complete a service at a known odometer with a known interval, verify the sum everywhere it appears, add later service history, and confirm the latest qualifying record becomes the source without duplicate stored totals.
  - Status: Missing.

- [ ] Due-soon, due-now, and overdue mileage status calculation
  - Expected behavior: A documented mileage threshold deterministically produces due soon below the target, due now at the target, and overdue above it; status is derived from current odometer and next-service mileage and never becomes stale.
  - Relevant files: `frontend/src/types/fleet.ts`, `frontend/src/services/fleetDataService.ts`, `frontend/src/services/dashboardService.ts`, `frontend/src/services/reportService.ts`, `frontend/src/utils`
  - Manual test: Set readings immediately below the due-soon boundary, at each boundary, at the target, and above the target; refresh and verify badges, dashboards, reports, and notifications all agree.
  - Status: Contradictory — current states are stored and calendar-date based; due soon and due now do not exist.

- [ ] Role-based access for administrator, manager, mechanic, and driver
  - Expected behavior: Routes, navigation, visible actions, read scopes, and service mutations use one documented permission matrix; direct URL and direct service-call attempts fail for unauthorized roles; current-user data is session-derived.
  - Relevant files: `frontend/src/routes/AppRoutes.tsx`, `frontend/src/routes/ProtectedRoute.tsx`, `frontend/src/routes/RoleRoute.tsx`, `frontend/src/routes/roleNavigation.ts`, `frontend/src/context/AuthContext.tsx`, `frontend/src/services/fleetDataService.ts`
  - Manual test: Use each development account to open every route and exercise every mutation, including calls from developer tools; compare UI controls with service authorization and confirm mechanics/drivers only see their linked records.
  - Status: Partial — route and current-user behavior are strong, but management services lack actor checks and manager work-order transition permissions differ between UI and service.

- [ ] Search and filtering
  - Expected behavior: Each directory/log/report that can contain multiple records provides relevant, case-insensitive search and filters, resets pagination safely, and shows an accurate empty state.
  - Relevant files: `frontend/src/pages/admin/UsersPage.tsx`, `frontend/src/pages/shared/DriversPage.tsx`, `MechanicsPage.tsx`, `VehiclesPage.tsx`, `AssignmentsPage.tsx`, `MaintenanceSchedulesPage.tsx`, `WorkOrdersPage.tsx`, `ServiceHistoryPage.tsx`, `ServiceTypesPage.tsx`, `ReportsPage.tsx`
  - Manual test: Search by every advertised field, combine filters, clear search, reduce a multi-page result, test no matches, and repeat at mobile width.
  - Status: Partial — primary tables are searchable and many are filterable, but reports/audit lack filters and pagination coverage is limited.

- [ ] Data-derived reports
  - Expected behavior: Vehicle, maintenance, assignment, mileage, role, and service-due reports are calculated from current source records; odometer readings are not incorrectly summed as travelled distance; no card uses a static total.
  - Relevant files: `frontend/src/pages/shared/ReportsPage.tsx`, `frontend/src/services/reportService.ts`, `frontend/src/types/fleet.ts`
  - Manual test: Record one controlled mutation per report category and verify only the mathematically affected values change; independently calculate mileage and due-status totals from the records.
  - Status: Partial — report values are record-derived, but mileage aggregation is semantically invalid and mileage-based maintenance reports are absent.

- [ ] Audit logging
  - Expected behavior: Every create, update, deactivate, assignment, odometer, maintenance, service-type, and relevant account action produces an immutable audit event containing actor, action, entity, and timestamp; authorized users can search/filter the log.
  - Relevant files: `frontend/src/types/fleet.ts`, `frontend/src/services/fleetDataService.ts`, `frontend/src/data/mockFleetData.ts`, `frontend/src/pages/admin/AdminDashboardPage.tsx`
  - Manual test: Perform every mutation once, count and inspect the resulting audit entries, attempt an unauthorized mutation, refresh, and verify missing/failed actions are handled according to policy and prior entries cannot be edited through the UI.
  - Status: Partial — selected operational actions are logged, but most management/service-type/note/auth events and a dedicated log view are missing.

- [ ] Input validation
  - Expected behavior: Required, format, range, uniqueness, date, transition, mileage, interval, and relationship rules are enforced both in forms and in services with clear errors; impossible dates and non-finite values fail.
  - Relevant files: `frontend/src/utils/validation.ts`, `frontend/src/services/fleetDataService.ts`, `frontend/src/services/authService.ts`, `frontend/src/components/common`, `frontend/src/pages/auth`, `frontend/src/pages/driver/DriverMileagePage.tsx`
  - Manual test: Submit empty, whitespace-only, malformed, duplicate, boundary, impossible-date, `NaN`/infinite, negative, stale, and unauthorized values through UI and direct service calls; verify no partial write occurs.
  - Status: Partial — many rules are enforced, but impossible dates, non-finite vehicle values, odometer edit consistency, text limits, and all mileage-interval rules remain open.

- [ ] Relationship and referential-integrity protection
  - Expected behavior: All foreign IDs resolve; user/profile creation is atomic; active and historical dependencies prevent destructive deletion; storage restoration rejects or safely repairs malformed/orphaned records; auth and fleet identities cannot drift.
  - Relevant files: `frontend/src/services/fleetDataService.ts`, `frontend/src/services/authService.ts`, `frontend/src/context/AuthContext.tsx`, `frontend/src/types/fleet.ts`, `frontend/src/services/managementViewService.ts`, `frontend/src/services/operationsViewService.ts`
  - Manual test: Attempt each deactivation with active/historical links, tamper stored foreign keys and record shapes, simulate storage-write failure, update identity fields, refresh/sign out/sign in, and confirm records remain linked or fail closed.
  - Status: Partial — normal UI relationships are protected and history is preserved, but storage validation is shallow and auth/fleet plus vehicle/mileage state can diverge.

- [ ] Notifications generated by meaningful fleet events
  - Expected behavior: Documented assignment, mileage, maintenance-due, work assignment, completion, cancellation, and status events create one relevant notification for the correct current account; unread count is derived and destinations are authorized real routes.
  - Relevant files: `frontend/src/services/fleetDataService.ts`, `frontend/src/services/sharedViewService.ts`, `frontend/src/pages/shared/NotificationsPage.tsx`, `frontend/src/components/layout/AuthenticatedHeaderActions.tsx`, `frontend/src/types/fleet.ts`
  - Manual test: Trigger every documented event for two drivers and two mechanics, verify recipients/unread counts/destinations, mark one/all read, and confirm no cross-account disclosure or duplicate notice.
  - Status: Partial — core assignment/schedule/assignment-to-mechanic/completion/mileage events exist, but several lifecycle events are missing and maintenance reminders use dates rather than mileage status.

## Required scope limitations

- [ ] Mileage-based tracking only
  - Expected behavior: Service due calculations, badges, reports, and reminders use odometer mileage; dates may identify when a record occurred but do not determine preventive-service due status.
  - Relevant files: `frontend/src/types/fleet.ts`, `frontend/src/services/fleetDataService.ts`, `frontend/src/services/dashboardService.ts`, `frontend/src/services/managementViewService.ts`, `frontend/src/pages/shared/MaintenanceSchedulesPage.tsx`
  - Manual test: Advance dates without changing mileage, then change mileage without advancing dates; verify only mileage changes preventive-service status.
  - Status: Not met — maintenance due behavior is calendar-date based.

- [ ] Manual data entry only
  - Expected behavior: All odometer and maintenance source values are entered through explicit forms; no simulated sensor feed silently changes them.
  - Relevant files: `frontend/src/pages/driver/DriverMileagePage.tsx`, `frontend/src/components/common/VehicleFormModal.tsx`, `frontend/src/components/common/WorkOrderFormModal.tsx`, `frontend/src/services/fleetDataService.ts`
  - Manual test: Leave the app open and refresh without submitting a form; confirm no odometer or service record changes automatically.
  - Status: Met by the current frontend, aside from fixed mock seed initialization.

- [ ] No GPS
  - Expected behavior: No location collection, route tracking, map, coordinates, or GPS-derived status exists.
  - Relevant files: `frontend/src`
  - Manual test: Search the UI, permissions, network activity, types, and storage for location/coordinate/GPS data.
  - Status: Met — no GPS implementation found.

- [ ] No telematics
  - Expected behavior: No telematics connection, sensor feed, remote odometer, or diagnostic ingestion exists, and user-facing fixtures do not imply one.
  - Relevant files: `frontend/src/data/mockFleetData.ts`, `frontend/src/types/fleet.ts`, `frontend/src/services`
  - Manual test: Inspect data entry and network/storage behavior and search all visible copy for telematics claims.
  - Status: Partial — no telematics functionality exists, but a seeded service description explicitly mentions telematics sensors.

- [ ] No parts inventory
  - Expected behavior: No part, stock, request, reorder, or inventory workflow is presented as part of the system.
  - Relevant files: `frontend/src/data/mockFleetData.ts`, `frontend/src/pages`, `frontend/src/services`
  - Manual test: Inspect navigation, pages, forms, notifications, data types, and reports for parts workflows.
  - Status: Partial — no module exists, but a seeded notification says a parts request was updated.

- [ ] No payment processing
  - Expected behavior: No payment, invoice settlement, card, wallet, or payment-provider integration exists.
  - Relevant files: `frontend/src`, `frontend/package.json`
  - Manual test: Inspect routes, dependencies, forms, storage, and network behavior for payment functionality.
  - Status: Met — none found.

- [ ] No accounting integration
  - Expected behavior: No ledger, accounting export, bookkeeping connector, or accounting API exists.
  - Relevant files: `frontend/src`, `frontend/package.json`
  - Manual test: Inspect routes, dependencies, reports, exports, and network behavior for accounting functionality.
  - Status: Met — none found.

- [ ] No AI predictive diagnostics
  - Expected behavior: No AI/ML model, prediction, generated diagnosis, or unexplained predictive maintenance claim exists.
  - Relevant files: `frontend/src/types/fleet.ts`, `frontend/src/data/mockFleetData.ts`, `frontend/src/pages`, `frontend/package.json`
  - Manual test: Inspect dependencies, network calls, calculations, vehicle health display, and visible claims for predictive behavior.
  - Status: Partial — no AI exists, but the seeded `health` score is unexplained and should not be represented as predictive output.

- [ ] No automatic calendar-based service reminders
  - Expected behavior: No timer or date threshold automatically generates service-due status or reminders; preventive reminders derive from mileage events and mileage thresholds.
  - Relevant files: `frontend/src/services/fleetDataService.ts`, `frontend/src/services/dashboardService.ts`, `frontend/src/types/fleet.ts`, `frontend/src/pages/driver/DriverDashboardPage.tsx`
  - Manual test: Cross a calendar date without changing mileage and verify no due-state/reminder change; then cross a mileage threshold and verify the documented event is generated.
  - Status: Not met in domain design — no background timer exists, but schedule status and reminder content are calendar-date based and mileage-triggered reminders are missing.

## Validation baseline recorded during audit

- [ ] Automated validation remains green after IM2 alignment
  - Expected behavior: `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` all exit successfully, with new mileage-boundary, authorization, audit, and integrity tests included.
  - Relevant files: `frontend/package.json`, all `frontend/src/**/*.test.ts` and `frontend/src/**/*.test.tsx`
  - Manual test: Run all four commands from `frontend/` and compare the test inventory with every requirement above.
  - Status: Current baseline passes: lint passed; typecheck passed; 9 test files/53 tests passed; build passed with 118 modules transformed. Required IM2 gap tests do not yet exist.
