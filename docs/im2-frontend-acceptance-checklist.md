# IM2 Frontend Acceptance Checklist

This checklist is intentionally left unchecked for formal acceptance testing. The `Status` line records the current audit result, not a completed sign-off. Tests should begin from reset mock data and use the signed-in account named by each item.

## Completed domain-model stabilization

- [x] Canonical typed fleet models
  - Expected behavior: The active frontend defines one canonical TypeScript model for User, DriverProfile, MechanicProfile, Vehicle, VehicleAssignment, MileageLog, ServiceType, MaintenanceWorkOrder, MaintenanceHistoryRecord, Notification, and AuditEvent with the required relationship fields.
  - Relevant files: `frontend/src/types/fleet.ts`
  - Manual test: Run type checking and inspect the exported interfaces and `FleetState` collections for the required fields and names.
  - Status: Completed — all requested models are canonical members of `FleetState`; legacy domain type names are no longer used by the active application.

- [x] One centralized typed fleet state and persistence boundary
  - Expected behavior: All fleet records use one versioned `FleetState`; pages/components do not read browser storage; reads and writes pass through `fleetDataService`.
  - Relevant files: `frontend/src/types/fleet.ts`, `frontend/src/services/fleetDataService.ts`, `frontend/src/hooks/useFleetData.ts`
  - Manual test: Search pages/components/context/hooks for storage calls, mutate records through the service, refresh, and confirm the v3 state restores.
  - Status: Completed — the only active fleet persistence boundary is `fleetDataService`; authentication credentials/session remain isolated auth concerns rather than a duplicate fleet-record collection.

- [x] Standardized profile and operational relationships
  - Expected behavior: Driver/mechanic profiles link to users by `userId`; assignments and mileage logs link by `driverId`; work orders/history link vehicles, service types, mechanics, requesters, and work orders using the standardized IDs.
  - Relevant files: `frontend/src/types/fleet.ts`, `frontend/src/services/fleetDataService.ts`, `frontend/src/services/managementViewService.ts`, `frontend/src/services/operationsViewService.ts`, `frontend/src/services/sharedViewService.ts`
  - Manual test: Resolve each development user's profile from session user ID, then trace its assignments, mileage, work, history, and notifications without using a fixed current-record ID.
  - Status: Completed — relationships are ID-based and current-user views resolve from the authenticated session user ID.

- [x] Separate work-order and maintenance-history records
  - Expected behavior: Work orders represent workflow state; a completed service creates one linked MaintenanceHistoryRecord containing service date, mechanic, odometer-at-service, cost placeholder, and notes; history is not a second copied work-order collection.
  - Relevant files: `frontend/src/types/fleet.ts`, `frontend/src/services/fleetDataService.ts`, `frontend/src/services/operationsViewService.ts`, `frontend/src/pages/shared/ServiceHistoryPage.tsx`
  - Manual test: Complete a work order, confirm exactly one history record references its `workOrderId`, repeat/reload, and verify the recorded odometer equals the vehicle odometer at completion.
  - Status: Completed for the data model and service boundary.

- [x] Versioned migration and malformed-state recovery
  - Expected behavior: Valid v2 browser data migrates once to v3, usable records and relationships are retained, the legacy key is removed after success, and malformed or orphaned persisted data fails closed to seeded canonical data.
  - Relevant files: `frontend/src/services/fleetStateMigration.ts`, `frontend/src/services/fleetDataService.ts`, `frontend/src/services/fleetDataService.test.ts`
  - Manual test: Seed valid v2 data and inspect v3 output; then seed a v3 assignment with a missing driver relationship and confirm the invalid state is removed and seeded records load.
  - Status: Completed — deep collection/field/foreign-key checks and both migration/recovery tests are present.

- [x] Relationship-resolution and migration tests
  - Expected behavior: Tests verify linked user/profile creation, session-user dashboard resolution, migrated field/relationship mapping, malformed foreign-key recovery, and work-order-to-history linkage.
  - Relevant files: `frontend/src/services/fleetDataService.test.ts`, `frontend/src/services/dashboardService.test.ts`, `frontend/src/services/fleetOperationsService.test.ts`, `frontend/src/routes/AppRoutes.test.tsx`
  - Manual test: Run `npm run test` and inspect the named tests for assertions against standardized relationship fields rather than hardcoded current-user assumptions.
  - Status: Completed — the domain-model baseline contains 55 passing tests across 9 files; later feature stages extend that suite.

## Completed manual odometer workflow

- [x] Session-derived mileage submission
  - Expected behavior: The active session user resolves to a driver profile and active assignment; the driver can submit mileage only for that assigned, operational vehicle without any fixed driver or vehicle ID in application logic.
  - Relevant files: `frontend/src/pages/driver/DriverMileagePage.tsx`, `frontend/src/services/fleetDataService.ts`, `frontend/src/services/sharedViewService.ts`
  - Manual test: Sign in with a driver account, submit mileage for the displayed assignment, then repeat with a driver that has no assignment and with the assigned vehicle in maintenance.
  - Status: Completed — driver, assignment, and vehicle relationships are resolved from the authenticated user ID; missing assignments and unavailable vehicles are rejected.

- [x] Strict odometer validation and atomic vehicle update
  - Expected behavior: A required finite non-negative whole-number reading must be greater than both the current vehicle mileage and latest vehicle log; success creates one log and updates the vehicle in the same persisted state change.
  - Relevant files: `frontend/src/pages/driver/DriverMileagePage.tsx`, `frontend/src/components/common/VehicleFormModal.tsx`, `frontend/src/services/fleetDataService.ts`, `frontend/src/types/shared.ts`
  - Manual test: Try empty, non-numeric, negative, fractional, lower, equal, and increasing readings; refresh after success and try changing mileage through vehicle editing.
  - Status: Completed — invalid values receive inline/service errors, successful logs update the vehicle, and vehicle editing cannot bypass the mileage-log workflow.

- [x] Mileage-derived service recalculation and threshold notification
  - Expected behavior: After an odometer update, active service definitions derive their next-service mileage from the latest matching service history plus the interval; the final 10% of the interval is due soon, the target is due now, and readings above it are overdue. A notification is created only when the reading crosses into a more urgent status.
  - Relevant files: `frontend/src/services/mileageService.ts`, `frontend/src/services/fleetDataService.ts`, `frontend/src/pages/driver/DriverMileagePage.tsx`, `frontend/src/types/fleet.ts`
  - Manual test: Submit readings immediately below, at, and above the due-soon and next-service boundaries; inspect the derived status table and notification list after each submission.
  - Status: Completed for the manual mileage workflow — status is derived rather than stored, and threshold crossings create account-scoped reminders.

- [x] Mileage audit and authorized operational visibility
  - Expected behavior: Every successful submission creates an immutable audit event, the driver sees assigned vehicle/current/latest/history details, and administrators/managers can inspect current mileage logs through their existing reports route.
  - Relevant files: `frontend/src/services/fleetDataService.ts`, `frontend/src/services/reportService.ts`, `frontend/src/pages/driver/DriverMileagePage.tsx`, `frontend/src/pages/shared/ReportsPage.tsx`
  - Manual test: Submit one reading, verify its audit event and driver history, then sign in as administrator or manager and find the same record in Recent mileage logs.
  - Status: Completed.

## Required capabilities

- [ ] Vehicle inventory management
  - Expected behavior: An authorized administrator or manager can list, search, filter, sort, view, create, edit, and deactivate vehicles; identifiers remain unique; odometer history cannot be lowered or bypassed; all mutations enforce permission and create audit events.
  - Relevant files: `frontend/src/pages/shared/VehiclesPage.tsx`, `frontend/src/components/common/VehicleFormModal.tsx`, `frontend/src/services/fleetDataService.ts`, `frontend/src/services/managementViewService.ts`, `frontend/src/types/fleet.ts`, `frontend/src/types/management.ts`
  - Manual test: Sign in as administrator and manager, exercise every vehicle action including duplicate plate/fleet number and linked-record deactivation; then verify a driver/mechanic is denied and verify odometer/audit history remains consistent.
  - Status: Partial — UI CRUD exists and odometer edits can no longer bypass mileage history, but management service authorization and complete vehicle audit coverage remain missing.

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
  - Status: Implemented — session-derived ownership, active-assignment/vehicle checks, strict increasing validation, atomic log/vehicle persistence, inline feedback, audit creation, mileage-status recalculation, threshold reminders, history, and administrator/manager report visibility are covered.

- [ ] Maintenance-history recording
  - Expected behavior: Completing a work order records service type, vehicle, mechanic, completion date, service notes, and odometer-at-service; history remains read-only, linked, searchable, and visible according to role.
  - Relevant files: `frontend/src/pages/shared/WorkOrdersPage.tsx`, `frontend/src/pages/shared/ServiceHistoryPage.tsx`, `frontend/src/services/fleetDataService.ts`, `frontend/src/services/operationsViewService.ts`, `frontend/src/types/fleet.ts`
  - Manual test: Complete assigned work with and without required notes/odometer, refresh, search history, inspect links, and compare administrator, manager, mechanic, and driver visibility including a driver's previously assigned vehicle.
  - Status: Partial — completion now creates linked history with odometer-at-service, but driver history is still restricted to the current vehicle and cost entry is not yet a UI workflow.

- [ ] Service-type definitions
  - Expected behavior: An administrator can create, edit, search, and deactivate a unique service type with a required positive mileage interval; linked historical records remain readable; unauthorized roles cannot mutate it.
  - Relevant files: `frontend/src/pages/shared/ServiceTypesPage.tsx`, `frontend/src/components/common/ServiceTypeFormModal.tsx`, `frontend/src/services/fleetDataService.ts`, `frontend/src/types/fleet.ts`, `frontend/src/types/operations.ts`
  - Manual test: Create/edit/deactivate a service type, test duplicate name and invalid intervals, use it in maintenance, verify linked history after deactivation, and attempt mutations as every role.
  - Status: Implemented for the definition layer — name, description, positive whole-kilometre interval, status, authorization, and service-type audit events are present; downstream due calculations remain separate unchecked requirements.

- [ ] Mileage-based service intervals
  - Expected behavior: Every interval-based service definition stores a validated distance in the chosen system unit and the value is used consistently by maintenance calculations, forms, reports, and notifications.
  - Relevant files: `frontend/src/types/fleet.ts`, `frontend/src/types/operations.ts`, `frontend/src/components/common/ServiceTypeFormModal.tsx`, `frontend/src/services/fleetDataService.ts`
  - Manual test: Create services with valid, zero, negative, fractional, and missing intervals; reload data and confirm valid intervals drive calculations without a calendar-due dependency.
  - Status: Partial — validated intervals now drive derived driver mileage statuses and threshold notifications; mileage-based report/dashboard replacement remains for a later integration stage.

- [ ] Automatic next-service mileage calculation
  - Expected behavior: For each vehicle/service pair, next service mileage is derived from the latest qualifying completed-service odometer plus the service interval and automatically updates after service completion or a corrected source record.
  - Relevant files: `frontend/src/types/fleet.ts`, `frontend/src/services/fleetDataService.ts`, `frontend/src/services/operationsViewService.ts`, `frontend/src/services/managementViewService.ts`, `frontend/src/services/reportService.ts`
  - Manual test: Complete a service at a known odometer with a known interval, verify the sum everywhere it appears, add later service history, and confirm the latest qualifying record becomes the source without duplicate stored totals.
  - Status: Partial — `mileageService` derives next mileage from the latest matching history odometer plus the interval and refreshes it after mileage writes; remaining dashboards/reports do not all consume the calculation yet.

- [ ] Due-soon, due-now, and overdue mileage status calculation
  - Expected behavior: A documented mileage threshold deterministically produces due soon below the target, due now at the target, and overdue above it; status is derived from current odometer and next-service mileage and never becomes stale.
  - Relevant files: `frontend/src/types/fleet.ts`, `frontend/src/services/fleetDataService.ts`, `frontend/src/services/dashboardService.ts`, `frontend/src/services/reportService.ts`, `frontend/src/utils`
  - Manual test: Set readings immediately below the due-soon boundary, at each boundary, at the target, and above the target; refresh and verify badges, dashboards, reports, and notifications all agree.
  - Status: Partial — the manual mileage workflow now derives due soon, due now, and overdue without storing stale status, using a documented final-10%-of-interval due-soon threshold. Legacy schedule views still expose separate calendar statuses.

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
  - Status: Partial — mileage summaries now use distinct vehicles and distance between logged readings, and recent logs are relationship-derived; mileage-based maintenance report categories are still absent.

- [ ] Audit logging
  - Expected behavior: Every create, update, deactivate, assignment, odometer, maintenance, service-type, and relevant account action produces an immutable audit event containing actor, action, entity, and timestamp; authorized users can search/filter the log.
  - Relevant files: `frontend/src/types/fleet.ts`, `frontend/src/services/fleetDataService.ts`, `frontend/src/data/mockFleetData.ts`, `frontend/src/pages/admin/AdminDashboardPage.tsx`
  - Manual test: Perform every mutation once, count and inspect the resulting audit entries, attempt an unauthorized mutation, refresh, and verify missing/failed actions are handled according to policy and prior entries cannot be edited through the UI.
  - Status: Partial — selected operational and service-type actions are logged with the standardized AuditEvent model, but most management/note/auth events and a dedicated log view are missing.

- [ ] Input validation
  - Expected behavior: Required, format, range, uniqueness, date, transition, mileage, interval, and relationship rules are enforced both in forms and in services with clear errors; impossible dates and non-finite values fail.
  - Relevant files: `frontend/src/utils/validation.ts`, `frontend/src/services/fleetDataService.ts`, `frontend/src/services/authService.ts`, `frontend/src/components/common`, `frontend/src/pages/auth`, `frontend/src/pages/driver/DriverMileagePage.tsx`
  - Manual test: Submit empty, whitespace-only, malformed, duplicate, boundary, impossible-date, `NaN`/infinite, negative, stale, and unauthorized values through UI and direct service calls; verify no partial write occurs.
  - Status: Partial — mileage submission now enforces required, finite, non-negative, whole-number, strictly increasing, assignment, and vehicle-availability rules in both UI and service; impossible dates and broader text limits remain open.

- [ ] Relationship and referential-integrity protection
  - Expected behavior: All foreign IDs resolve; user/profile creation is atomic; active and historical dependencies prevent destructive deletion; storage restoration rejects or safely repairs malformed/orphaned records; auth and fleet identities cannot drift.
  - Relevant files: `frontend/src/services/fleetDataService.ts`, `frontend/src/services/authService.ts`, `frontend/src/context/AuthContext.tsx`, `frontend/src/types/fleet.ts`, `frontend/src/services/managementViewService.ts`, `frontend/src/services/operationsViewService.ts`
  - Manual test: Attempt each deactivation with active/historical links, tamper stored foreign keys and record shapes, simulate storage-write failure, update identity fields, refresh/sign out/sign in, and confirm records remain linked or fail closed.
  - Status: Partial — persisted fleet relationships fail closed and vehicle mileage is now mutated only with a linked mileage log after creation; auth/fleet identity synchronization remains open.

- [ ] Notifications generated by meaningful fleet events
  - Expected behavior: Documented assignment, mileage, maintenance-due, work assignment, completion, cancellation, and status events create one relevant notification for the correct current account; unread count is derived and destinations are authorized real routes.
  - Relevant files: `frontend/src/services/fleetDataService.ts`, `frontend/src/services/sharedViewService.ts`, `frontend/src/pages/shared/NotificationsPage.tsx`, `frontend/src/components/layout/AuthenticatedHeaderActions.tsx`, `frontend/src/types/fleet.ts`
  - Manual test: Trigger every documented event for two drivers and two mechanics, verify recipients/unread counts/destinations, mark one/all read, and confirm no cross-account disclosure or duplicate notice.
  - Status: Partial — manual mileage threshold crossings now generate account-scoped due-soon/due-now/overdue reminders, but several non-mileage lifecycle events and legacy calendar reminders remain.

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
  - Status: Met — no telematics functionality exists and the conflicting seeded wording was removed during mock-data migration.

- [ ] No parts inventory
  - Expected behavior: No part, stock, request, reorder, or inventory workflow is presented as part of the system.
  - Relevant files: `frontend/src/data/mockFleetData.ts`, `frontend/src/pages`, `frontend/src/services`
  - Manual test: Inspect navigation, pages, forms, notifications, data types, and reports for parts workflows.
  - Status: Met — no parts module exists and the conflicting seeded notification was replaced with a work-order update.

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
  - Status: Met — no AI exists and the unexplained vehicle-health field was removed from the canonical model and current vehicle view.

- [ ] No automatic calendar-based service reminders
  - Expected behavior: No timer or date threshold automatically generates service-due status or reminders; preventive reminders derive from mileage events and mileage thresholds.
  - Relevant files: `frontend/src/services/fleetDataService.ts`, `frontend/src/services/dashboardService.ts`, `frontend/src/types/fleet.ts`, `frontend/src/pages/driver/DriverDashboardPage.tsx`
  - Manual test: Cross a calendar date without changing mileage and verify no due-state/reminder change; then cross a mileage threshold and verify the documented event is generated.
  - Status: Partial — manual odometer changes now generate mileage-threshold reminders with no timer, but existing schedule status and some seeded reminder content remain calendar-date based.

## Validation baseline recorded during audit

- [ ] Automated validation remains green after IM2 alignment
  - Expected behavior: `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` all exit successfully, with new mileage-boundary, authorization, audit, and integrity tests included.
  - Relevant files: `frontend/package.json`, all `frontend/src/**/*.test.ts` and `frontend/src/**/*.test.tsx`
  - Manual test: Run all four commands from `frontend/` and compare the test inventory with every requirement above.
  - Status: Current mileage-workflow baseline passes: format passed; lint passed; typecheck passed; 10 test files/66 tests passed; build passed with 120 modules transformed. Mileage boundaries, lower/equal rejection, assignment and vehicle eligibility, current-user association, atomic vehicle updates, audit creation, threshold reminders, migration, and relationship integrity have automated coverage; broader permission-boundary tests remain for later stages.
