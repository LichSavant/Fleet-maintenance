-- ForgeFleet complete Supabase schema
-- Safe to apply to a fresh project or over the earlier ForgeFleet draft schema.
-- Existing business rows are preserved; policies, triggers, functions, and views are replaced.

begin;
create extension if not exists pgcrypto;

do $$ begin create type public.app_role as enum ('admin','manager','mechanic','driver'); exception when duplicate_object then null; end $$;
do $$ begin create type public.account_status as enum ('active','inactive'); exception when duplicate_object then null; end $$;
do $$ begin create type public.driver_status as enum ('assigned','available','inactive'); exception when duplicate_object then null; end $$;
do $$ begin create type public.vehicle_status as enum ('active','maintenance','inspection','out_of_service'); exception when duplicate_object then null; end $$;
do $$ begin create type public.assignment_status as enum ('active','ended'); exception when duplicate_object then null; end $$;
do $$ begin create type public.work_order_status as enum ('scheduled','assigned','in_progress','completed','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.schedule_status as enum ('overdue','upcoming','converted','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.priority_level as enum ('low','medium','high'); exception when duplicate_object then null; end $$;
do $$ begin create type public.notification_type as enum ('assignment','maintenance','mileage','reminder','schedule','system'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null check (length(trim(full_name)) >= 2),
  role public.app_role not null,
  status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_normalized check (email = lower(trim(email)))
);
create unique index if not exists profiles_email_unique_ci on public.profiles(lower(email));

create table if not exists public.manager_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  depot text not null default 'Unassigned depot' check (length(trim(depot)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.driver_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  license_number text not null check (length(trim(license_number)) > 0),
  status public.driver_status not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists driver_license_unique_ci on public.driver_profiles(lower(license_number));

create table if not exists public.mechanic_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  specialty text not null check (length(trim(specialty)) > 0),
  status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  fleet_number text not null,
  manufacturer text not null check (length(trim(manufacturer)) > 0),
  model text not null check (length(trim(model)) > 0),
  plate text not null,
  vehicle_type text not null check (length(trim(vehicle_type)) > 0),
  model_year integer not null check (model_year between 1950 and extract(year from current_date)::int + 1),
  mileage bigint not null default 0 check (mileage >= 0),
  health smallint not null default 100 check (health between 0 and 100),
  status public.vehicle_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists vehicles_fleet_number_unique_ci on public.vehicles(upper(fleet_number));
create unique index if not exists vehicles_plate_unique_ci on public.vehicles(upper(plate));
create index if not exists vehicles_status_idx on public.vehicles(status);

create table if not exists public.service_types (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  description text not null check (length(trim(description)) > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists service_types_name_unique_ci on public.service_types(lower(name));

create table if not exists public.vehicle_assignments (
  id uuid primary key default gen_random_uuid(),
  driver_profile_id uuid not null references public.driver_profiles(id) on delete restrict,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  start_date date not null,
  end_date date,
  status public.assignment_status not null default 'active',
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignment_dates_valid check (end_date is null or end_date >= start_date),
  constraint assignment_status_dates_valid check (
    (status='active' and end_date is null) or (status='ended' and end_date is not null)
  )
);
create unique index if not exists one_active_assignment_per_driver on public.vehicle_assignments(driver_profile_id) where status='active';
create unique index if not exists one_active_assignment_per_vehicle on public.vehicle_assignments(vehicle_id) where status='active';

create table if not exists public.maintenance_schedules (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  service_type_id uuid not null references public.service_types(id) on delete restrict,
  mechanic_profile_id uuid references public.mechanic_profiles(id) on delete set null,
  due_date date not null,
  notes text not null default '',
  status public.schedule_status not null default 'upcoming',
  work_order_id uuid,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists schedules_due_date_idx on public.maintenance_schedules(due_date);

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  work_order_number bigint generated always as identity unique,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  service_type_id uuid not null references public.service_types(id) on delete restrict,
  mechanic_profile_id uuid references public.mechanic_profiles(id) on delete set null,
  schedule_id uuid unique references public.maintenance_schedules(id) on delete set null,
  scheduled_date date not null,
  completed_date date,
  priority public.priority_level not null default 'medium',
  status public.work_order_status not null default 'scheduled',
  notes text not null default '',
  service_notes text not null default '',
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint completed_work_has_date check ((status='completed' and completed_date is not null) or status<>'completed'),
  constraint completion_not_before_schedule check (completed_date is null or completed_date >= scheduled_date)
);
alter table public.maintenance_schedules drop constraint if exists maintenance_schedules_work_order_id_fkey;
alter table public.maintenance_schedules add constraint maintenance_schedules_work_order_id_fkey foreign key(work_order_id) references public.work_orders(id) on delete set null;
create index if not exists work_orders_status_idx on public.work_orders(status);
create index if not exists work_orders_mechanic_idx on public.work_orders(mechanic_profile_id);
create index if not exists work_orders_vehicle_idx on public.work_orders(vehicle_id);

create table if not exists public.service_history (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null unique references public.work_orders(id) on delete restrict,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  service_type_id uuid not null references public.service_types(id) on delete restrict,
  mechanic_profile_id uuid references public.mechanic_profiles(id) on delete set null,
  completed_date date not null,
  odometer_at_service bigint not null check (odometer_at_service >= 0),
  priority public.priority_level not null,
  service_notes text not null,
  recorded_at timestamptz not null default now()
);
create index if not exists service_history_vehicle_date_idx on public.service_history(vehicle_id,completed_date desc);

create table if not exists public.mileage_submissions (
  id uuid primary key default gen_random_uuid(),
  driver_profile_id uuid not null references public.driver_profiles(id) on delete restrict,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  mileage bigint not null check (mileage >= 0),
  notes text not null default '',
  submission_date date not null default current_date,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(driver_profile_id,vehicle_id,submission_date)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  role public.app_role,
  title text not null,
  message text not null,
  destination text not null default '/',
  type public.notification_type not null default 'system',
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint notification_audience_required check (user_id is not null or role is not null)
);

create table if not exists public.system_activity (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  entity_label text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path=public as $$
begin new.updated_at=now(); return new; end; $$;

create or replace function public.current_user_role() returns public.app_role
language sql stable security definer set search_path=public as $$
  select role from public.profiles where id=auth.uid() and status='active' limit 1;
$$;
create or replace function public.has_role(allowed public.app_role[]) returns boolean
language sql stable security definer set search_path=public as $$
  select coalesce(public.current_user_role()=any(allowed),false);
$$;

create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path=public as $$
declare requested_role public.app_role; requested_license text; requested_specialty text;
begin
  requested_role := coalesce((new.raw_user_meta_data->>'role')::public.app_role,'driver');
  if requested_role in ('admin','manager') and new.invited_at is null then
    raise exception 'Administrator and Manager accounts must be invited by an administrator';
  end if;
  insert into public.profiles(id,email,full_name,role,status)
  values(new.id,lower(coalesce(new.email,'')),trim(coalesce(nullif(new.raw_user_meta_data->>'full_name',''),'New User')),requested_role,'active')
  on conflict(id) do update set email=excluded.email,full_name=excluded.full_name;
  if requested_role='manager' then
    insert into public.manager_profiles(user_id,depot) values(new.id,coalesce(nullif(trim(new.raw_user_meta_data->>'depot'),''),'Unassigned depot')) on conflict(user_id) do nothing;
  elsif requested_role='driver' then
    requested_license:=nullif(trim(new.raw_user_meta_data->>'license_number'),'');
    if requested_license is null then raise exception 'Driver license number is required'; end if;
    insert into public.driver_profiles(user_id,license_number,status) values(new.id,requested_license,'available') on conflict(user_id) do nothing;
  elsif requested_role='mechanic' then
    requested_specialty:=nullif(trim(new.raw_user_meta_data->>'specialty'),'');
    if requested_specialty is null then raise exception 'Mechanic specialty is required'; end if;
    insert into public.mechanic_profiles(user_id,specialty,status) values(new.id,requested_specialty,'active') on conflict(user_id) do nothing;
  end if;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_auth_user();

create or replace function public.sync_auth_user_identity() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  update public.profiles set email=lower(coalesce(new.email,email)),full_name=coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''),full_name),updated_at=now() where id=new.id;
  return new;
end; $$;
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated after update of email,raw_user_meta_data on auth.users for each row execute function public.sync_auth_user_identity();

create or replace function public.protect_profile_security_fields() returns trigger
language plpgsql set search_path=public as $$
begin
  if auth.uid()=old.id then
    new.email:=old.email; new.role:=old.role; new.status:=old.status;
  end if;
  new.email:=lower(trim(new.email)); new.full_name:=trim(new.full_name);
  return new;
end; $$;

create or replace function public.validate_profile_role_tables() returns trigger
language plpgsql set search_path=public as $$
declare r public.app_role;
begin
  select role into r from public.profiles where id=new.user_id;
  if tg_table_name='driver_profiles' and r<>'driver' then raise exception 'User role must be driver'; end if;
  if tg_table_name='mechanic_profiles' and r<>'mechanic' then raise exception 'User role must be mechanic'; end if;
  if tg_table_name='manager_profiles' and r<>'manager' then raise exception 'User role must be manager'; end if;
  return new;
end; $$;

create or replace function public.validate_assignment() returns trigger
language plpgsql set search_path=public as $$
declare ds public.driver_status; us public.account_status; vs public.vehicle_status;
begin
  if new.start_date>current_date then raise exception 'Assignment start date cannot be in the future'; end if;
  select d.status,p.status into ds,us from public.driver_profiles d join public.profiles p on p.id=d.user_id where d.id=new.driver_profile_id;
  select status into vs from public.vehicles where id=new.vehicle_id;
  if new.status='active' then
    if tg_op='INSERT' and (ds<>'available' or us<>'active') then raise exception 'Driver must be active and available'; end if;
    if vs<>'active' then raise exception 'Vehicle must be active'; end if;
  end if;
  return new;
end; $$;

create or replace function public.sync_assignment_state() returns trigger
language plpgsql security definer set search_path=public as $$
declare driver_user uuid; vehicle_label text;
begin
  select user_id into driver_user from public.driver_profiles where id=new.driver_profile_id;
  select fleet_number into vehicle_label from public.vehicles where id=new.vehicle_id;
  if new.status='active' and (tg_op='INSERT' or old.status is distinct from new.status) then
    update public.driver_profiles set status='assigned',updated_at=now() where id=new.driver_profile_id;
    insert into public.notifications(user_id,title,message,destination,type)
    values(driver_user,'New vehicle assignment',vehicle_label||' is now assigned to you.','/driver/dashboard','assignment');
  elsif new.status='ended' and (tg_op='INSERT' or old.status is distinct from new.status) then
    update public.driver_profiles set status='available',updated_at=now() where id=new.driver_profile_id and status<>'inactive';
  end if;
  if tg_op='INSERT' or old.status is distinct from new.status then
    insert into public.system_activity(user_id,action,entity_type,entity_id,entity_label)
    values(coalesce(new.created_by,auth.uid()),case when new.status='active' then 'Created vehicle assignment' else 'Ended vehicle assignment' end,'vehicle_assignment',new.id,vehicle_label);
  end if;
  return new;
end; $$;

create or replace function public.prepare_schedule() returns trigger
language plpgsql set search_path=public as $$
begin
  if new.status in ('upcoming','overdue') then new.status:=case when new.due_date<current_date then 'overdue' else 'upcoming' end; end if;
  if not exists(select 1 from public.service_types where id=new.service_type_id and active) then raise exception 'Service type must be active'; end if;
  return new;
end; $$;

create or replace function public.after_schedule_change() returns trigger
language plpgsql security definer set search_path=public as $$
declare vehicle_label text; service_label text; driver_user uuid; mechanic_user uuid;
begin
  select fleet_number into vehicle_label from public.vehicles where id=new.vehicle_id;
  select name into service_label from public.service_types where id=new.service_type_id;
  if tg_op='INSERT' then
    select d.user_id into driver_user from public.vehicle_assignments a join public.driver_profiles d on d.id=a.driver_profile_id where a.vehicle_id=new.vehicle_id and a.status='active' limit 1;
    if driver_user is not null then insert into public.notifications(user_id,title,message,destination,type) values(driver_user,'Upcoming maintenance reminder',service_label||' for '||vehicle_label||' is due on '||new.due_date||'.','/driver/maintenance','reminder'); end if;
    if new.mechanic_profile_id is not null then
      select user_id into mechanic_user from public.mechanic_profiles where id=new.mechanic_profile_id;
      insert into public.notifications(user_id,title,message,destination,type) values(mechanic_user,'Maintenance schedule assigned',service_label||' for '||vehicle_label||' is planned for '||new.due_date||'.','/mechanic/dashboard','schedule');
    end if;
    insert into public.system_activity(user_id,action,entity_type,entity_id,entity_label) values(new.created_by,'Created maintenance schedule','maintenance_schedule',new.id,vehicle_label||' · '||service_label);
  elsif old.status is distinct from new.status and new.status='cancelled' then
    insert into public.system_activity(user_id,action,entity_type,entity_id,entity_label) values(auth.uid(),'Cancelled maintenance schedule','maintenance_schedule',new.id,vehicle_label||' · '||service_label);
  end if;
  return new;
end; $$;

create or replace function public.validate_work_order_change() returns trigger
language plpgsql set search_path=public as $$
begin
  if tg_op='UPDATE' and public.current_user_role()='mechanic' then
    new.vehicle_id:=old.vehicle_id;
    new.service_type_id:=old.service_type_id;
    new.mechanic_profile_id:=old.mechanic_profile_id;
    new.schedule_id:=old.schedule_id;
    new.scheduled_date:=old.scheduled_date;
    new.priority:=old.priority;
    new.notes:=old.notes;
    new.created_by:=old.created_by;
  end if;
  if tg_op='UPDATE' and old.status is distinct from new.status then
    if not ((old.status='scheduled' and new.status in ('assigned','cancelled')) or (old.status='assigned' and new.status in ('in_progress','cancelled')) or (old.status='in_progress' and new.status='completed')) then
      raise exception 'Invalid work-order status transition: % to %',old.status,new.status;
    end if;
  end if;
  if new.status in ('assigned','in_progress','completed') and new.mechanic_profile_id is null then raise exception 'Assign a mechanic before progressing this work order'; end if;
  if new.status='completed' then
    if length(trim(new.service_notes))=0 then raise exception 'Service notes are required before completion'; end if;
    new.completed_date:=coalesce(new.completed_date,current_date);
  end if;
  return new;
end; $$;

create or replace function public.after_work_order_change() returns trigger
language plpgsql security definer set search_path=public as $$
declare vehicle_label text; service_label text; mechanic_user uuid; driver_user uuid;
begin
  select fleet_number into vehicle_label from public.vehicles where id=new.vehicle_id;
  select name into service_label from public.service_types where id=new.service_type_id;
  if new.schedule_id is not null then update public.maintenance_schedules set work_order_id=new.id,status='converted',updated_at=now() where id=new.schedule_id; end if;
  if tg_op='INSERT' then
    insert into public.system_activity(user_id,action,entity_type,entity_id,entity_label) values(new.created_by,'Created maintenance work order','work_order',new.id,vehicle_label||' · '||service_label);
  end if;
  if new.mechanic_profile_id is not null and (tg_op='INSERT' or old.mechanic_profile_id is distinct from new.mechanic_profile_id) then
    select user_id into mechanic_user from public.mechanic_profiles where id=new.mechanic_profile_id;
    insert into public.notifications(user_id,title,message,destination,type) values(mechanic_user,'Work order assigned',service_label||' for '||vehicle_label||' is assigned to you.','/maintenance/work-orders','maintenance');
  end if;
  if new.status='in_progress' then update public.vehicles set status='maintenance',updated_at=now() where id=new.vehicle_id; end if;
  if new.status='completed' and (tg_op='INSERT' or old.status is distinct from new.status) then
    insert into public.service_history(work_order_id,vehicle_id,service_type_id,mechanic_profile_id,completed_date,odometer_at_service,priority,service_notes)
    select new.id,new.vehicle_id,new.service_type_id,new.mechanic_profile_id,new.completed_date,v.mileage,new.priority,new.service_notes from public.vehicles v where v.id=new.vehicle_id on conflict(work_order_id) do nothing;
    if not exists(select 1 from public.work_orders where vehicle_id=new.vehicle_id and id<>new.id and status='in_progress') then update public.vehicles set status='active',updated_at=now() where id=new.vehicle_id and status='maintenance'; end if;
    select d.user_id into driver_user from public.vehicle_assignments a join public.driver_profiles d on d.id=a.driver_profile_id where a.vehicle_id=new.vehicle_id and a.status='active' limit 1;
    if driver_user is not null then insert into public.notifications(user_id,title,message,destination,type) values(driver_user,'Vehicle maintenance completed',service_label||' for '||vehicle_label||' was completed.','/maintenance/history','maintenance'); end if;
  end if;
  if tg_op='UPDATE' and old.status is distinct from new.status then
    insert into public.system_activity(user_id,action,entity_type,entity_id,entity_label) values(auth.uid(),'Updated work order to '||replace(new.status::text,'_',' '),'work_order',new.id,vehicle_label||' · '||service_label);
  end if;
  return new;
end; $$;

create or replace function public.protect_notification_update() returns trigger
language plpgsql set search_path=public as $$
begin
  new.user_id:=old.user_id;
  new.role:=old.role;
  new.title:=old.title;
  new.message:=old.message;
  new.destination:=old.destination;
  new.type:=old.type;
  new.created_at:=old.created_at;
  return new;
end; $$;

create or replace function public.validate_and_sync_mileage() returns trigger
language plpgsql security definer set search_path=public as $$
declare active_vehicle uuid; current_mileage bigint; last_date date; driver_user uuid; vehicle_label text;
begin
  select a.vehicle_id,d.user_id into active_vehicle,driver_user from public.vehicle_assignments a join public.driver_profiles d on d.id=a.driver_profile_id where a.driver_profile_id=new.driver_profile_id and a.status='active';
  if active_vehicle is null or active_vehicle<>new.vehicle_id then raise exception 'Mileage requires the driver active vehicle assignment'; end if;
  if new.submission_date>current_date then raise exception 'Mileage submission date cannot be in the future'; end if;
  select mileage,fleet_number into current_mileage,vehicle_label from public.vehicles where id=new.vehicle_id for update;
  select max(submission_date) into last_date from public.mileage_submissions where driver_profile_id=new.driver_profile_id and vehicle_id=new.vehicle_id and id<>new.id;
  if last_date is not null and new.submission_date<last_date then raise exception 'Mileage date cannot precede the latest submission'; end if;
  if new.mileage<current_mileage then raise exception 'Mileage cannot decrease below current odometer'; end if;
  update public.vehicles set mileage=new.mileage,updated_at=now() where id=new.vehicle_id;
  insert into public.notifications(user_id,title,message,destination,type) values(driver_user,'Mileage submission recorded',new.mileage||' km was recorded for '||vehicle_label||'.','/driver/mileage','mileage');
  insert into public.system_activity(user_id,action,entity_type,entity_id,entity_label) values(driver_user,'Submitted mileage','mileage_submission',new.id,vehicle_label||' · '||new.mileage||' km');
  return new;
end; $$;

-- Replace triggers so reruns do not conflict.
do $$ declare r record; begin
  for r in select event_object_table,trigger_name from information_schema.triggers where trigger_schema='public' and trigger_name like 'forgefleet_%' loop execute format('drop trigger if exists %I on public.%I',r.trigger_name,r.event_object_table); end loop;
end $$;
create trigger forgefleet_profiles_protect before update on public.profiles for each row execute function public.protect_profile_security_fields();
create trigger forgefleet_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger forgefleet_managers_role before insert or update on public.manager_profiles for each row execute function public.validate_profile_role_tables();
create trigger forgefleet_drivers_role before insert or update on public.driver_profiles for each row execute function public.validate_profile_role_tables();
create trigger forgefleet_mechanics_role before insert or update on public.mechanic_profiles for each row execute function public.validate_profile_role_tables();
create trigger forgefleet_managers_updated before update on public.manager_profiles for each row execute function public.set_updated_at();
create trigger forgefleet_drivers_updated before update on public.driver_profiles for each row execute function public.set_updated_at();
create trigger forgefleet_mechanics_updated before update on public.mechanic_profiles for each row execute function public.set_updated_at();
create trigger forgefleet_vehicles_updated before update on public.vehicles for each row execute function public.set_updated_at();
create trigger forgefleet_services_updated before update on public.service_types for each row execute function public.set_updated_at();
create trigger forgefleet_assignment_validate before insert or update on public.vehicle_assignments for each row execute function public.validate_assignment();
create trigger forgefleet_assignment_updated before update on public.vehicle_assignments for each row execute function public.set_updated_at();
create trigger forgefleet_assignment_after after insert or update on public.vehicle_assignments for each row execute function public.sync_assignment_state();
create trigger forgefleet_schedule_prepare before insert or update on public.maintenance_schedules for each row execute function public.prepare_schedule();
create trigger forgefleet_schedule_updated before update on public.maintenance_schedules for each row execute function public.set_updated_at();
create trigger forgefleet_schedule_after after insert or update on public.maintenance_schedules for each row execute function public.after_schedule_change();
create trigger forgefleet_work_validate before insert or update on public.work_orders for each row execute function public.validate_work_order_change();
create trigger forgefleet_work_updated before update on public.work_orders for each row execute function public.set_updated_at();
create trigger forgefleet_work_after after insert or update on public.work_orders for each row execute function public.after_work_order_change();
create trigger forgefleet_mileage_validate before insert or update on public.mileage_submissions for each row execute function public.validate_and_sync_mileage();
create trigger forgefleet_notifications_protect before update on public.notifications for each row execute function public.protect_notification_update();

create or replace view public.vehicle_management_view with (security_invoker=true) as
select v.*,p.full_name assigned_driver,
 (select max(sh.completed_date) from public.service_history sh where sh.vehicle_id=v.id) last_service_date,
 (select min(ms.due_date) from public.maintenance_schedules ms where ms.vehicle_id=v.id and ms.status in ('upcoming','overdue')) next_service_date
from public.vehicles v
left join public.vehicle_assignments a on a.vehicle_id=v.id and a.status='active'
left join public.driver_profiles d on d.id=a.driver_profile_id
left join public.profiles p on p.id=d.user_id;

-- Preserve the earlier view column contract while upgrading its name.
-- SUM(bigint) from the draft view produced numeric; MAX(bigint) produces bigint.
-- The explicit numeric cast prevents CREATE OR REPLACE VIEW from changing the column type.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'fleet_report_summary'
      and column_name = 'recorded_mileage_total'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'fleet_report_summary'
      and column_name = 'highest_odometer'
  ) then
    alter view public.fleet_report_summary
      rename column recorded_mileage_total to highest_odometer;
  end if;
end $$;

create or replace view public.fleet_report_summary with (security_invoker=true) as
select
 (select count(*) from public.vehicles) total_vehicles,
 (select count(*) from public.vehicles where status='active') active_vehicles,
 (select count(*) from public.vehicle_assignments where status='active') active_assignments,
 (select count(*) from public.work_orders where status in ('scheduled','assigned','in_progress')) open_work_orders,
 (select count(*) from public.maintenance_schedules where status='overdue' or (status='upcoming' and due_date<current_date)) overdue_schedules,
 (select coalesce(max(mileage),0)::numeric from public.vehicles) highest_odometer;

alter table public.profiles enable row level security;
alter table public.manager_profiles enable row level security;
alter table public.driver_profiles enable row level security;
alter table public.mechanic_profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.service_types enable row level security;
alter table public.vehicle_assignments enable row level security;
alter table public.maintenance_schedules enable row level security;
alter table public.work_orders enable row level security;
alter table public.service_history enable row level security;
alter table public.mileage_submissions enable row level security;
alter table public.notifications enable row level security;
alter table public.system_activity enable row level security;

do $$ declare r record; begin
  for r in select schemaname,tablename,policyname from pg_policies where schemaname='public' and tablename in ('profiles','manager_profiles','driver_profiles','mechanic_profiles','vehicles','service_types','vehicle_assignments','maintenance_schedules','work_orders','service_history','mileage_submissions','notifications','system_activity') loop execute format('drop policy if exists %I on public.%I',r.policyname,r.tablename); end loop;
end $$;

create policy profiles_select on public.profiles for select to authenticated using (id=auth.uid() or public.has_role(array['admin','manager']::public.app_role[]));
create policy profiles_update_self on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy manager_profiles_select on public.manager_profiles for select to authenticated using (user_id=auth.uid() or public.has_role(array['admin','manager']::public.app_role[]));
create policy driver_profiles_select on public.driver_profiles for select to authenticated using (user_id=auth.uid() or public.has_role(array['admin','manager']::public.app_role[]));
create policy mechanic_profiles_select on public.mechanic_profiles for select to authenticated using (user_id=auth.uid() or public.has_role(array['admin','manager']::public.app_role[]));

create policy vehicles_select on public.vehicles for select to authenticated using (
 public.has_role(array['admin','manager']::public.app_role[]) or
 exists(select 1 from public.vehicle_assignments a join public.driver_profiles d on d.id=a.driver_profile_id where a.vehicle_id=vehicles.id and a.status='active' and d.user_id=auth.uid()) or
 exists(select 1 from public.work_orders w join public.mechanic_profiles m on m.id=w.mechanic_profile_id where w.vehicle_id=vehicles.id and m.user_id=auth.uid())
);
create policy vehicles_write on public.vehicles for all to authenticated using (public.has_role(array['admin','manager']::public.app_role[])) with check (public.has_role(array['admin','manager']::public.app_role[]));
create policy service_types_select on public.service_types for select to authenticated using (true);
create policy service_types_write on public.service_types for all to authenticated using (public.has_role(array['admin']::public.app_role[])) with check (public.has_role(array['admin']::public.app_role[]));

create policy assignments_select on public.vehicle_assignments for select to authenticated using (
 public.has_role(array['admin','manager']::public.app_role[]) or driver_profile_id=(select id from public.driver_profiles where user_id=auth.uid())
);
create policy assignments_write on public.vehicle_assignments for all to authenticated using (public.has_role(array['admin','manager']::public.app_role[])) with check (public.has_role(array['admin','manager']::public.app_role[]));

create policy schedules_select on public.maintenance_schedules for select to authenticated using (
 public.has_role(array['admin','manager']::public.app_role[]) or
 mechanic_profile_id=(select id from public.mechanic_profiles where user_id=auth.uid()) or
 exists(select 1 from public.vehicle_assignments a join public.driver_profiles d on d.id=a.driver_profile_id where a.vehicle_id=maintenance_schedules.vehicle_id and d.user_id=auth.uid())
);
create policy schedules_write on public.maintenance_schedules for all to authenticated using (public.has_role(array['admin','manager']::public.app_role[])) with check (public.has_role(array['admin','manager']::public.app_role[]));

create policy work_orders_select on public.work_orders for select to authenticated using (
 public.has_role(array['admin','manager']::public.app_role[]) or
 mechanic_profile_id=(select id from public.mechanic_profiles where user_id=auth.uid()) or
 exists(select 1 from public.vehicle_assignments a join public.driver_profiles d on d.id=a.driver_profile_id where a.vehicle_id=work_orders.vehicle_id and d.user_id=auth.uid())
);
create policy work_orders_management_write on public.work_orders for all to authenticated using (public.has_role(array['admin','manager']::public.app_role[])) with check (public.has_role(array['admin','manager']::public.app_role[]));
create policy work_orders_mechanic_update on public.work_orders for update to authenticated using (mechanic_profile_id=(select id from public.mechanic_profiles where user_id=auth.uid()) and status in ('assigned','in_progress')) with check (mechanic_profile_id=(select id from public.mechanic_profiles where user_id=auth.uid()) and status in ('in_progress','completed'));

create policy service_history_select on public.service_history for select to authenticated using (
 public.has_role(array['admin','manager']::public.app_role[]) or
 mechanic_profile_id=(select id from public.mechanic_profiles where user_id=auth.uid()) or
 exists(select 1 from public.vehicle_assignments a join public.driver_profiles d on d.id=a.driver_profile_id where a.vehicle_id=service_history.vehicle_id and d.user_id=auth.uid())
);
create policy mileage_select on public.mileage_submissions for select to authenticated using (public.has_role(array['admin','manager']::public.app_role[]) or driver_profile_id=(select id from public.driver_profiles where user_id=auth.uid()));
create policy mileage_insert on public.mileage_submissions for insert to authenticated with check (driver_profile_id=(select id from public.driver_profiles where user_id=auth.uid()));
create policy notifications_select on public.notifications for select to authenticated using (user_id=auth.uid() or (user_id is null and role=public.current_user_role()));
create policy notifications_update on public.notifications for update to authenticated using (user_id=auth.uid() or (user_id is null and role=public.current_user_role())) with check (user_id=auth.uid() or (user_id is null and role=public.current_user_role()));
create policy activity_select on public.system_activity for select to authenticated using (public.has_role(array['admin','manager']::public.app_role[]));

grant usage on schema public to authenticated;
grant select,insert,update,delete on all tables in schema public to authenticated;
grant usage,select on all sequences in schema public to authenticated;
grant select on public.vehicle_management_view,public.fleet_report_summary to authenticated;

insert into public.service_types(name,description,active) values
 ('Preventive Maintenance A','Routine preventive inspection and fluid-level service.',true),
 ('Brake System Inspection','Brake wear, pressure, and control-system inspection.',true),
 ('Annual Safety Inspection','Annual roadworthiness and safety compliance inspection.',true),
 ('Transmission Fluid Service','Transmission fluid, filter, and leak inspection service.',true),
 ('Electrical System Diagnostic','Electrical system and sensor fault diagnosis.',true),
 ('Sensor Calibration','Calibration of vehicle safety and telematics sensors.',true)
on conflict do nothing;

commit;
