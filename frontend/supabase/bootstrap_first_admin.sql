-- ForgeFleet one-time first Administrator bootstrap
--
-- 1. Register one DRIVER account through the ForgeFleet Sign Up screen.
-- 2. In Supabase Dashboard > Authentication > Users, copy that account UUID.
-- 3. Replace the UUID below, then run this entire script once in SQL Editor.
-- 4. Sign out and sign back in. The account will route to the Administrator dashboard.
--
-- This script refuses to promote an assigned driver and does not create sample data.

do $$
declare
  v_user_id uuid := '00000000-0000-0000-0000-000000000000'; -- REPLACE
  v_email text;
  v_full_name text;
begin
  if v_user_id = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'Replace v_user_id with the UUID of the account to promote';
  end if;

  select email, full_name
    into v_email, v_full_name
  from public.profiles
  where id = v_user_id;

  if not found then
    raise exception 'No ForgeFleet profile exists for user %', v_user_id;
  end if;

  if exists (
    select 1
    from public.vehicle_assignments assignment
    join public.driver_profiles driver
      on driver.id = assignment.driver_profile_id
    where driver.user_id = v_user_id
      and assignment.status = 'active'
  ) then
    raise exception 'End the driver active assignment before promotion';
  end if;

  delete from public.driver_profiles where user_id = v_user_id;
  delete from public.mechanic_profiles where user_id = v_user_id;
  delete from public.manager_profiles where user_id = v_user_id;

  update public.profiles
  set role = 'admin', status = 'active', updated_at = now()
  where id = v_user_id;

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object(
      'full_name', v_full_name,
      'role', 'admin'
    )
  where id = v_user_id;

  raise notice 'ForgeFleet Administrator created for %', v_email;
end $$;
