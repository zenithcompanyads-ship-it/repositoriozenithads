-- Add visible_to_client to monthly_plans
alter table public.monthly_plans
  add column if not exists visible_to_client boolean not null default false;

-- Allow csv_analysis as report type
alter table public.reports
  drop constraint if exists reports_type_check;

alter table public.reports
  add constraint reports_type_check
    check (type in ('weekly', 'biweekly', 'monthly', 'csv_analysis'));
