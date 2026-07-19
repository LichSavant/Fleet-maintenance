# ForgeFleet contributor instructions

## Project purpose

ForgeFleet is a fleet-maintenance frontend for administrators, managers, mechanics, and drivers. The rebuilt application must cover fleet records, assignments, maintenance work, mileage, notifications, reports, profiles, and role-aware dashboards without expanding beyond that product scope.

## Branch and scope

- Work only on the `frontend-rebuild` branch.
- The current milestone is frontend-only.
- Do not add a backend, database, PHP server, API implementation, server authentication, or infrastructure deployment.
- Stop and report a blocker when the active branch, required files, or validation environment is unavailable.

## Required technologies

- React
- Vite
- TypeScript with strict checking
- React Router for navigation and route protection
- Accessible semantic HTML and CSS
- A replaceable in-memory or browser-storage demo service until a backend is authorized

Do not change this stack or add a state-management, styling, form, chart, or component framework without a demonstrated need.

## Legacy prototype

- Preserve the existing static HTML/CSS/JavaScript prototype as a visual and behavioral reference.
- Do not silently delete, overwrite, or rewrite legacy files.
- Before removing or replacing a legacy file, confirm its references and record the replacement or reason.
- Reuse approved visual tokens, the Inter font files, the ForgeFleet hero image, role terminology, data relationships, validation rules, and useful workflows.
- Do not carry prototype-only security behavior into production-facing code. Plaintext demo passwords, client-visible approval codes, and frontend-only authorization must remain isolated and clearly labeled.

## Architecture and directories

Keep the React application simple and use only directories with real responsibilities:

```text
src/
├── assets/
├── components/
│   ├── common/
│   ├── layout/
│   └── ui/
├── context/
├── hooks/
├── layouts/
├── pages/
│   ├── auth/
│   ├── admin/
│   ├── manager/
│   ├── mechanic/
│   ├── driver/
│   └── shared/
├── routes/
├── services/
├── styles/
├── types/
├── utils/
├── App.tsx
└── main.tsx
```

- Pages own complete screens; reusable visual elements belong in components.
- Layouts own shared shells, headers, and sidebars.
- Route configuration and guards belong in `routes/`.
- Authentication state belongs in one typed context and hook, not in page components.
- Services own demo data access and persistence; components must not read localStorage directly.
- Shared domain models belong in `types/` and must not be duplicated per page.
- Avoid empty directories and deep nesting.

## Naming conventions

- React components, pages, layouts, providers, and types: `PascalCase`
- Component files: `PascalCase.tsx`
- Page files: `PascalCasePage.tsx`
- Layout files: `PascalCaseLayout.tsx`
- Hooks: `useFeatureName.ts`
- Services and utilities: `camelCase.ts` or descriptive `camelCaseService.ts`
- Variables and functions: `camelCase`
- True constants: `UPPER_SNAKE_CASE`
- CSS files should match the related component or page; shared styles use descriptive lowercase names.
- Every manually written file must be formatted, readable, and end with a newline.

Do not create `New`, `Final`, `Fixed`, `Copy`, or numbered variants of existing files.

## Current-user and role rules

- Never hardcode a specific user, driver, mechanic, vehicle, assignment, or record ID as the current account.
- Resolve the signed-in user from the authentication context.
- Resolve driver and mechanic profiles through relationships from that authenticated user ID.
- Derive assigned vehicles, tasks, mileage, reminders, notifications, and dashboard metrics from those resolved relationships.
- Put reusable permission rules in typed route/permission utilities.
- UI route protection is demonstration behavior only until server authorization exists; document that limitation.

## Implementation rules

- Build in small stages; do not rewrite the application in one operation.
- Preserve working behavior and design unless the task explicitly changes it.
- Do not invent features, fake controls, or buttons without implemented behavior.
- Do not mix mock data directly into components. Keep it behind a typed service interface.
- Do not add dependencies when a small local implementation is sufficient.
- Use existing package scripts and package manager once established.
- Do not edit generated output, dependency folders, or lockfiles unless dependency changes require it.
- Keep destructive actions confirmed and preserve useful empty, loading, error, and success states.

## Required validation commands

After the React scaffold exists, inspect `package.json` and run every applicable command before completing a task:

```text
npm run format
npm run lint
npm run typecheck
npm run test
npm run build
```

- If a script is not present, state that it was unavailable; do not claim it passed.
- Run focused tests for the feature changed, then the full applicable validation suite.
- For navigation or visual changes, manually verify the affected route, protected access, keyboard behavior, and responsive layout.
- Do not mark a task complete with unresolved build, lint, type, import, or routing errors.

## Definition of done for each task

A task is done only when:

- Work was performed on `frontend-rebuild`.
- The requested behavior is implemented and no visible control is inert.
- Legacy behavior and visuals outside the task remain intact.
- Current-user data is session-derived rather than tied to seeded IDs.
- Loading, empty, error, and authorization states are handled where relevant.
- Accessibility and responsive behavior were considered and checked.
- Affected imports, routes, assets, and service calls resolve.
- Applicable format, lint, typecheck, test, and build commands pass.
- Only intended files changed, and remaining limitations are reported honestly.
