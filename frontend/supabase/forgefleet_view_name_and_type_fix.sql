-- ForgeFleet fleet_report_summary compatibility repair
-- Safe for the earlier draft view that exposed recorded_mileage_total as numeric.
-- This renames that column and preserves its numeric type while changing the metric
-- from total submitted mileage to the highest current vehicle odometer.

begin;

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

create or replace view public.fleet_report_summary
with (security_invoker = true) as
select
  (select count(*) from public.vehicles) as total_vehicles,
  (select count(*) from public.vehicles where status = 'active') as active_vehicles,
  (select count(*) from public.vehicle_assignments where status = 'active') as active_assignments,
  (select count(*)
     from public.work_orders
    where status in ('scheduled', 'assigned', 'in_progress')) as open_work_orders,
  (select count(*)
     from public.maintenance_schedules
    where status = 'overdue'
       or (status = 'upcoming' and due_date < current_date)) as overdue_schedules,
  (select coalesce(max(mileage), 0)::numeric
     from public.vehicles) as highest_odometer;

grant select on public.fleet_report_summary to authenticated;

commit;
