# Backend handoff map

This document describes future integration only; no backend is implemented.

| Page/feature  | Current function                    | Future PHP action / entity                | Validation and authorization                            | States                      |
| ------------- | ----------------------------------- | ----------------------------------------- | ------------------------------------------------------- | --------------------------- |
| Login/logout  | `authenticate()`, sessionStorage    | Login/logout actions; users/roles/session | Email/password, rate limits; authenticated role         | Redirect or generic error   |
| Users         | `getUsers`, upsert/remove           | User CRUD; users/roles                    | Unique email, allowed status; Admin                     | Toast, field/general error  |
| Vehicles      | `getVehicles`, upsert/remove        | Vehicle CRUD; vehicles                    | Plate/VIN/year/mileage; Admin writes                    | Table refresh/error         |
| Drivers       | `getDrivers`, upsert/remove         | Driver CRUD; drivers/users                | License/phone; Admin writes                             | Toast/error                 |
| Assignments   | `createAssignment`, `endAssignment` | Assignment actions; assignments           | Active uniqueness and dates; Manager/Admin              | Success/conflict            |
| Service types | service type CRUD                   | Service-type actions/table                | Unique name/interval; Admin                             | Toast/error                 |
| Schedules     | schedule CRUD                       | Schedule actions/table                    | Foreign keys, valid date/status; Manager/Admin          | Status/overdue error        |
| Maintenance   | maintenance CRUD                    | Maintenance actions/tables                | Valid transition, cost/date; assigned Mechanic or Admin | Update/confirmation/error   |
| Mileage       | `createMileageLog`                  | Mileage action/table                      | Ownership, date, monotonic mileage; Driver              | Success/validation error    |
| Notifications | get/mark read                       | Notification actions/table                | Recipient ownership; authenticated user                 | Count/read/error            |
| Profile       | `updateProfile`                     | Profile action/users                      | Email/phone; self or Admin                              | Saved/error                 |
| Search        | client grouped search               | Authorized search action/entities         | Escape query, role scope                                | Results/empty/error         |
| Reports/CSV   | report calculations                 | Aggregate report action/tables            | Filters and export permission                           | Updated report/export error |
| Audit         | `getAuditLogs`                      | Audit query/audit_logs                    | Admin, immutable records                                | List/empty/error            |

Future handlers must use CSRF protection, server-side validation, prepared queries, authorization, ownership checks, stable database IDs, and audit logging. Approved frontend layout must not be redesigned during integration.

## Authentication and registration handoff

- Replace localStorage accounts with MySQL users, roles, role profiles, invitations, approval records, and login-audit tables.
- Replace plaintext demonstration credentials with PHP `password_hash()`/`password_verify()` or equivalent production password handling.
- Replace sessionStorage with hardened PHP sessions, secure cookies, session rotation, expiry, logout invalidation, and server route guards.
- Enforce Admin/Manager approval codes as expiring, single-use server invitation records rather than shared constants.
- Perform duplicate email, role-field, license-expiry, account-status, and authorization checks on the server inside transactions.
- Implement non-enumerating password recovery with signed, expiring, single-use tokens and real email delivery.
- Audit registration, approval, login success/failure, status changes, role changes, password changes, and logout.
