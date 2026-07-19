# ForgeFleet Supabase setup

## 1. Apply the database

Use a fresh Supabase project when possible. In **SQL Editor**, run the complete contents of:

```text
supabase/forgefleet_complete.sql
```

The same SQL is also stored as the versioned migration:

```text
supabase/migrations/202607190001_forgefleet_complete.sql
```

Do not run both files; they contain the same schema.

## 2. Create the first Administrator

Public registration is intentionally limited to Driver and Mechanic accounts. This prevents an unauthenticated visitor from granting themselves privileged access.

1. Register a temporary Driver account from `/sign-up`.
2. Copy its UUID from **Authentication > Users**.
3. Open `supabase/bootstrap_first_admin.sql`.
4. Replace the placeholder UUID.
5. Run the script once in SQL Editor.
6. Sign out and sign back in.

After this bootstrap, the Administrator can invite Admin, Manager, Mechanic, and Driver users from the ForgeFleet Users page. Managers can invite Driver and Mechanic users from their permitted management screens.

## 3. Deploy the privileged user-management function

The browser never receives the Supabase service-role key. Privileged account creation and identity updates are handled by the `admin-users` Edge Function.

Using the Supabase CLI from the project root:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy admin-users
```

The hosted function automatically receives the project URL, anon key, and service-role key from Supabase.

## 4. Configure authentication URLs

In **Authentication > URL Configuration**:

- Set **Site URL** to the deployed frontend origin, for example `https://fleet.example.com`.
- Add the local development URL, typically `http://localhost:5173/**`, to Redirect URLs.
- Add the deployed reset route, for example `https://fleet.example.com/reset-password`, to Redirect URLs.

## 5. Configure the frontend

Copy `.env.example` to `.env.local` and fill in the values from **Project Settings > API**:

```bash
cp .env.example .env.local
```

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Only the publishable/anon key belongs in the frontend. Never put the service-role key in a Vite environment variable.

## 6. Verify

```bash
npm install
npm run verify
npm run dev
```

The verification command runs formatting checks, ESLint, Vitest, strict TypeScript checking, and a production Vite build.

## Compatibility note for an earlier draft database

The current full SQL preserves the reporting view's existing `numeric` output type while renaming `recorded_mileage_total` to `highest_odometer`. This prevents PostgreSQL error `42P16` during an upgrade from the earlier draft schema.

Use `forgefleet_complete.sql` from the beginning. The smaller `forgefleet_view_name_and_type_fix.sql` is provided only for repairing that reporting view independently.
