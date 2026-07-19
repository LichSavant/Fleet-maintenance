# ForgeFleet

ForgeFleet is a role-based fleet-maintenance SaaS application built with React, strict TypeScript, Vite, Supabase Auth, PostgreSQL, Row-Level Security, and a Supabase Edge Function for privileged identity operations.

The visual system is a polished light iOS/SaaS interface based on the approved ForgeFleet concept: cinematic logistics authentication screens, frosted-glass surfaces, restrained blue accents, responsive role navigation, data-driven dashboard cards, charts, tables, status indicators, and accessible operational forms.

## Scope implemented

### Administrator

- Administrator dashboard
- Users
- Drivers
- Mechanics
- Vehicles
- Assignments
- Schedules
- Work orders
- Service history
- Service types
- Reports

### Manager

- Manager dashboard
- Drivers
- Mechanics
- Vehicles
- Assignments
- Schedules
- Work orders
- Service history
- Service types
- Reports

### Mechanic

- Mechanic dashboard
- Assigned work orders
- Work-order start, notes, and completion workflow
- Service history

### Driver

- Driver dashboard
- Mileage submission
- Assigned-vehicle maintenance view
- Service history

### Shared account features

- Supabase email/password sign in
- Driver and Mechanic self-registration
- Administrator/Manager invitation workflow
- Email password recovery and password reset
- Profile and password updates
- Role guards, notifications, and responsive navigation

## No placeholder business data

Dashboard totals, charts, lists, reports, assignments, work orders, mileage, schedules, notifications, and service history are calculated from the records visible to the signed-in user through Supabase. The project contains no demo account credentials and no mock fleet dataset. Empty databases render intentional empty states rather than fabricated totals.

Static copy such as labels, headings, route names, and validation messages remains in the frontend because it is interface content, not fleet data.

## Architecture

```text
React + TypeScript UI
        |
@supabase/supabase-js
        |
Supabase Auth + PostgreSQL + RLS
        |
admin-users Edge Function
```

Important boundaries:

- `src/services/authService.ts` owns browser-safe authentication operations.
- `src/services/fleetDataService.ts` is the fleet query and mutation boundary.
- `src/hooks/useFleetData.ts` synchronizes the authenticated UI with remote records.
- View services derive dashboards and tables from the current RLS-filtered snapshot.
- `supabase/forgefleet_complete.sql` defines tables, constraints, triggers, policies, views, and initial service-type reference records.
- `supabase/functions/admin-users/index.ts` performs privileged Auth Admin operations without exposing the service-role key to the browser.

## Database integrity and authorization

The database enforces:

- One active vehicle per driver and one active driver per vehicle
- Active/available driver and active-vehicle assignment eligibility
- Valid assignment and service dates
- Controlled work-order state transitions
- Mechanic ownership of assigned work
- Required service notes before completion
- Automatic service-history snapshots
- Driver mileage ownership and non-decreasing odometers
- Role-filtered records through RLS
- Server-generated activity and notification records
- Protected Admin/Manager account provisioning

Frontend role guards improve navigation, while PostgreSQL RLS remains the authoritative data-access control.

## Setup

Detailed Supabase instructions are in:

```text
supabase/SETUP.md
```

Quick start:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Required environment variables:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

## Commands

| Command                | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `npm run dev`          | Start the Vite development server                    |
| `npm run format`       | Check Prettier formatting                            |
| `npm run format:write` | Apply Prettier formatting                            |
| `npm run lint`         | Run ESLint                                           |
| `npm run test`         | Run Vitest                                           |
| `npm run typecheck`    | Run strict TypeScript validation                     |
| `npm run build`        | Type-check and build production assets               |
| `npm run verify`       | Run formatting, linting, tests, and production build |
| `npm run preview`      | Preview the production build                         |

## Routes

Public/authentication:

- `/`
- `/sign-in`
- `/sign-up`
- `/forgot-password`
- `/reset-password`

Authenticated routes are role guarded and match the modules listed under **Scope implemented**. Unknown paths render the not-found screen, while cross-role requests redirect through authorization guards.

## Validation status

The delivered workspace has been checked with:

```text
Prettier
ESLint
Vitest
TypeScript --noEmit
Vite production build
```

A live end-to-end Supabase test still requires your own project URL, publishable key, applied SQL, deployed Edge Function, and email configuration. Those credentials are deliberately not embedded in the workspace.
