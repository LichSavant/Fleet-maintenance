# ForgeFleet frontend rebuild plan

Plan date: 2026-07-19

Required branch: `frontend-rebuild`

## Completion status

The frontend rebuild and final integration review are complete. The active application is in `frontend/`; the original prototype is archived in `legacy-static/`. The original staged plan remains below as the implementation record.

Completed outcomes:

- React, Vite, strict TypeScript, React Router, plain CSS, ESLint, Prettier, Vitest, and Testing Library foundation.
- Shared design system, public/authenticated layouts, accessible modal behavior, and responsive navigation.
- Frontend authentication, session restoration, role guards, linked Driver/Mechanic self-registration, and sign out.
- Four session-derived dashboards and typed role navigation.
- User, driver, mechanic, vehicle, assignment, schedule, work-order, service-history, service-type, mileage, notification, profile, and report workflows required by the rebuild prompts.
- Centralized mock state with relationship checks, deactivation protections, monotonic mileage, validated work-order transitions, and action-generated notifications.
- Final route matrix, keyboard-navigation tests, responsive review at approximately 360/768/1024/1440 pixels, dead preview removal, documentation, and legacy archival.

Scope decisions from the historical plan:

- Legacy-only global search, settings, audit-log, CSV-export, separate reminder URLs, and decorative command-center charts were not carried into the active application because they were outside the approved prompt series or did not provide complete behavior.
- Reports remain honest browser-calculated summaries and have no inert export controls.
- All backend-dependent behavior remains explicitly unavailable rather than simulated as secure or real-time.

## Objective

Rebuild the current static ForgeFleet demonstration as a React, Vite, and TypeScript frontend while preserving the useful design, role workflows, data relationships, and validation behavior. The rebuild remains frontend-only and must keep all data access behind a replaceable typed service.

The work should be delivered in reviewable stages. Each stage ends with applicable formatting, linting, type checking, tests, a production build, and focused manual verification.

## Stage 1: audit and governance

Deliverables:

- Current static implementation audit.
- This staged rebuild plan.
- Root contributor instructions in `AGENTS.md`.
- Clean `frontend-rebuild` branch with documentation-only changes.

Exit criteria:

- Legacy pages, data, components, assets, controls, and limitations are documented.
- No website implementation files are modified.

## Stage 2: preserve legacy and scaffold React

Actions:

- Preserve the complete static prototype under the clearly named `legacy-static/` directory. Move it as one coherent tree so its relative paths remain valid.
- Create the Vite React TypeScript application in `frontend/`.
- Configure strict TypeScript, React Router, ESLint, Prettier, and the smallest practical test setup.
- Establish `App.tsx`, `main.tsx`, global styles, error boundary, and a genuine not-found route.
- Copy approved assets into the React source; retain license notices.

Do not build product pages in this stage beyond a minimal routed shell used to prove the toolchain.

Exit criteria:

- Legacy reference remains viewable.
- React development server, lint, typecheck, tests, and production build pass.
- `/`, `/login`, and an unknown route resolve through React Router.

## Stage 3: design system and shared layouts

Actions:

- Port the charcoal/gold design tokens, Inter fonts, focus treatments, responsive breakpoints, cards, buttons, inputs, badges, tables, empty states, modal, and toast patterns.
- Build `AuthLayout` and `DashboardLayout` with reusable sidebar, topbar, breadcrumbs, profile menu, mobile navigation, notification indicator, and sign-out control.
- Replace text-symbol icons with one consistent accessible icon approach.
- Preserve reduced-motion behavior and mobile table overflow.

Exit criteria:

- Shared components have typed props and documented variants.
- Layout works at approximately 360, 768, 1024, and 1440 pixels.
- Keyboard navigation, Escape behavior, focus restoration, and modal focus trapping are verified.

## Stage 4: typed domain and demo data services

Actions:

- Define shared types for roles, users, drivers, mechanics, vehicles, assignments, service types, maintenance schedules, maintenance records, mileage logs, notifications, and audit events.
- Normalize the useful seeded records into one demo dataset.
- Remove the separate command-center dataset that conflicts with core records.
- Implement a typed repository/service boundary with explicit results and errors.
- Isolate browser persistence behind a versioned storage adapter with reset and parse-failure handling.
- Preserve assignment uniqueness, monotonic mileage, notification read state, service-type reference checks, and safe CSV generation.

Exit criteria:

- Components do not import seed data or localStorage directly.
- Service tests cover IDs, relationships, validation rules, reset behavior, and malformed storage.
- No current-account query contains a hardcoded seeded record ID.

## Stage 5: authentication and role routing demonstration

Actions:

- Build typed `AuthContext`, `useAuth`, `ProtectedRoute`, and `RoleRoute` primitives.
- Port sign-in, registration, password visibility, validation, remembered email, session restoration, role redirects, and sign-out.
- Resolve role profiles from the authenticated user ID.
- Keep demo credentials and registration behavior clearly isolated from future production authentication.
- Keep forgot-password behavior honest: validate the request and explain that delivery is unavailable without pretending an email was sent.

Exit criteria:

- All four seeded roles can sign in and reach their own dashboard.
- Signed-out and cross-role direct URLs are guarded.
- Refresh preserves the supported demo session.
- Auth tests cover invalid, inactive, signed-out, and unauthorized cases.

## Stage 6: shared and administrator workflows

Actions:

- Port profile, notifications, global search, settings, and not-found pages.
- Port the Administrator dashboard using calculated core data rather than the separate hardcoded command-center dataset.
- Port users, vehicles, drivers, service types, maintenance, mileage logs, reminders, reports, and audit views.
- Preserve search, status filtering, sorting, pagination, CRUD forms, confirmation dialogs, account deletion safeguards, report calculations, and CSV sanitization.
- Make settings actually apply compact-table and reduced-motion preferences.

Exit criteria:

- Every Administrator navigation control has a working destination or action.
- CRUD and safety rules have focused tests.
- Active navigation matches route names consistently.

## Stage 7: manager workflows

Actions:

- Port the Manager dashboard, vehicle and driver views, assignments, schedules, reminders, and reports.
- Enforce frontend permission boundaries for Manager operations.
- Preserve assignment conflict checks and end-assignment relationship updates.
- Remove route aliases or redirects that do not add product value.

Exit criteria:

- Manager navigation and direct routes are coherent.
- Manager cannot access Administrator-only screens through the UI or route guards.
- Assignment creation, conflict, update, and completion flows are tested.

## Stage 8: mechanic workflows

Actions:

- Port the Mechanic dashboard, assigned maintenance tasks, service history, profile, and notifications.
- Derive the mechanic profile from the authenticated user, then scope all work by its ID.
- Provide only supported task transitions and editable findings, work performed, and notes.
- Prevent mechanics from viewing or mutating unrelated maintenance records.

Exit criteria:

- Two different mechanic accounts produce different scoped results without code changes.
- Task status transitions and completion validation are tested.

## Stage 9: driver workflows

Actions:

- Port the Driver dashboard, assigned vehicle, mileage history/submission, maintenance reminders, profile, and notifications.
- Derive the driver profile and assignment from the authenticated user.
- Enforce vehicle ownership and monotonic mileage through the demo service.
- Remove duplicate notification URLs and use a single shared notification page.

Exit criteria:

- Two different driver accounts resolve their own assignments and records.
- Mileage regression, duplicate-date, unassigned-driver, and valid submission cases are tested.

## Stage 10: consolidation and parity review

Actions:

- Compare every legacy route and visible control with its React replacement.
- Remove duplicate React components and dead migration code only after confirming usage.
- Verify empty, loading, error, confirmation, session-expiry, unauthorized, and not-found states.
- Complete accessibility, responsive, browser-console, and visual regression checks.
- Update the README with the actual install, development, test, build, and preview commands.

Exit criteria:

- Format, lint, typecheck, tests, and production build pass.
- All required role flows pass manual verification.
- Legacy files remain available as an archived reference in `legacy-static/`.
- Remaining backend-dependent limitations are explicit.

## Recommended implementation order within a stage

1. Add or refine types and service contracts.
2. Add focused service and permission tests.
3. Implement reusable components or hooks.
4. Implement the route/page behavior.
5. Verify keyboard and responsive behavior.
6. Run the full applicable validation suite.
7. Report exact changes and blockers before moving to the next stage.

## Explicitly excluded from the frontend rebuild

- PHP, databases, API endpoints, server sessions, email delivery, deployment infrastructure, or backend authorization.
- Client-visible approval codes presented as real security.
- Plaintext local passwords outside the isolated legacy/demo adapter.
- The duplicate hardcoded Administrator command-center dataset.
- Hardcoded current-user, driver, mechanic, vehicle, or assignment IDs.
- Decorative buttons, fabricated live metrics, or controls without behavior.
- New fleet features not demonstrated by or required for the current product scope.

## Backend integration plan

The next authorized phase should replace the browser adapters behind the existing typed service boundaries. It requires:

1. Secure identity, password hashing, session rotation/revocation, recovery, and password-change endpoints.
2. Server-side role and record-level authorization for every read and mutation.
3. Persistent normalized users, role profiles, vehicles, assignments, schedules, work orders, service history, mileage, notifications, and audit events.
4. Transactional validation for assignment conflicts, deactivation safeguards, mileage monotonicity, and work-order state transitions.
5. Versioning or optimistic concurrency for simultaneous edits.
6. API error contracts that map cleanly to the existing frontend error states.
7. Server-generated notification delivery and report queries with timestamps and source attribution.
8. Environment configuration, secure secret handling, observability, migration, backup, and deployment plans.

The page layer must continue to call typed services rather than accessing network or storage APIs directly.
