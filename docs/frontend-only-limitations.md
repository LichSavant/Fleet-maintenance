# Frontend-only limitations

## Current implementation stage

ForgeFleet is currently in the frontend implementation stage. The active application demonstrates the Fleet Maintenance Log workflow with React, Vite, TypeScript, React Router, and browser persistence. It does not include a backend, API, database, or server process.

## Temporary browser persistence

Fleet records, notifications, audit events, registered demonstration accounts, and the current session are stored in the browser. This persistence is temporary, origin-specific, user-editable, and unsuitable as an authoritative organizational record. Clearing ForgeFleet browser keys restores the seeded demonstration data.

## Backend requirements

A production implementation requires:

- Secure authentication with password hashing, account recovery, session expiry, and protected credentials.
- Relational database persistence with transactions, constraints, backups, migration tooling, and recovery procedures.
- Server-side authorization for every read and mutation; React route guards are presentation controls only.
- Concurrency control so simultaneous users cannot overwrite assignments, mileage, work orders, or maintenance completion.
- Production audit logs created and protected on the server with retention, tamper resistance, access controls, and reliable timestamps.
- Server-generated notifications and durable delivery/read state where organizational requirements demand them.

## Demonstration constraints

- Management-created fleet user records do not automatically provision secure sign-in credentials. The documented development accounts are used for role demonstrations.
- Browser data is local to one origin and browser profile and is not shared between devices or users.
- Frontend authorization can be bypassed by a person who controls the browser. It must not be described as secure authorization.
- Audit events are frontend demonstration data, not compliance-grade or production audit records.
- The system uses manual data entry and mileage-based service calculations only.
- Scheduled dates are manual planning metadata. They do not automatically determine due-soon, due-now, or overdue maintenance status.

ForgeFleet intentionally does not implement GPS, telematics, predictive AI, parts inventory, payment processing, accounting integration, or automatic calendar-based maintenance reminders.
