-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- CLIENTS TABLE
-- ============================================================
create table public.clients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  segment text,
  meta_ad_account_id text,
  meta_access_token text,
  active boolean not null default true,
  color text default '#4040E8',
  initials text,
  since_date date default current_date,
  monthly_budget numeric(12,2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'client')) default 'client',
  client_id uuid references public.clients(id) on delete set null,
  full_name text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- METRICS TABLE
-- ============================================================
create table public.metrics (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  date date not null,
  spend numeric(12,2) default 0,
  impressions bigint default 0,
  clicks bigint default 0,
  ctr numeric(8,4) default 0,
  cpc numeric(10,4) default 0,
  cpm numeric(10,4) default 0,
  roas numeric(8,4) default 0,
  reach bigint default 0,
  conversions bigint default 0,
  created_at timestamptz not null default now(),
  unique(client_id, date)
);

-- ============================================================
-- CAMPAIGNS TABLE
-- ============================================================
create table public.campaigns (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  meta_campaign_id text,
  name text not null,
  objective text,
  status text default 'ACTIVE',
  budget numeric(12,2) default 0,
  impressions bigint default 0,
  clicks bigint default 0,
  ctr numeric(8,4) default 0,
  cpc numeric(10,4) default 0,
  conversions bigint default 0,
  spend numeric(12,2) default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ============================================================
-- REPORTS TABLE
-- ============================================================
create table public.reports (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  type text not null check (type in ('weekly', 'biweekly', 'monthly')),
  period_start date not null,
  period_end date not null,
  content_json jsonb default '{}'::jsonb,
  claude_analysis text,
  admin_edited_analysis text,
  visible_to_client boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- GOALS TABLE
-- ============================================================
create table public.goals (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  metric text not null,
  target_value numeric(12,4) not null,
  period text not null check (period in ('daily', 'weekly', 'monthly')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(client_id, metric, period)
);

-- ============================================================
-- MONTHLY PLANS TABLE
-- ============================================================
create table public.monthly_plans (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  month date not null,
  content text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(client_id, month)
);

-- ============================================================
-- ALERTS TABLE
-- ============================================================
create table public.alerts (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  metric text not null,
  threshold numeric(12,4),
  current_value numeric(12,4),
  message text,
  resolved boolean not null default false,
  triggered_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_metrics_client_date on public.metrics(client_id, date desc);
create index idx_campaigns_client on public.campaigns(client_id);
create index idx_reports_client_type on public.reports(client_id, type, created_at desc);
create index idx_alerts_client_resolved on public.alerts(client_id, resolved, triggered_at desc);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger clients_updated_at before update on public.clients
  for each row execute function public.handle_updated_at();

create trigger reports_updated_at before update on public.reports
  for each row execute function public.handle_updated_at();

create trigger goals_updated_at before update on public.goals
  for each row execute function public.handle_updated_at();

create trigger monthly_plans_updated_at before update on public.monthly_plans
  for each row execute function public.handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.clients enable row level security;
alter table public.users enable row level security;
alter table public.metrics enable row level security;
alter table public.campaigns enable row level security;
alter table public.reports enable row level security;
alter table public.goals enable row level security;
alter table public.monthly_plans enable row level security;
alter table public.alerts enable row level security;

-- Helper function to get current user role
create or replace function public.get_user_role()
returns text as $$
  select role from public.users where id = auth.uid();
$$ language sql security definer stable;

-- Helper function to get current user client_id
create or replace function public.get_user_client_id()
returns uuid as $$
  select client_id from public.users where id = auth.uid();
$$ language sql security definer stable;

-- CLIENTS policies
create policy "admin_all_clients" on public.clients
  for all using (public.get_user_role() = 'admin');

create policy "client_own_client" on public.clients
  for select using (
    public.get_user_role() = 'client' and id = public.get_user_client_id()
  );

-- USERS policies
create policy "admin_all_users" on public.users
  for all using (public.get_user_role() = 'admin');

create policy "user_own_row" on public.users
  for select using (id = auth.uid());

-- METRICS policies
create policy "admin_all_metrics" on public.metrics
  for all using (public.get_user_role() = 'admin');

create policy "client_own_metrics" on public.metrics
  for select using (
    public.get_user_role() = 'client' and client_id = public.get_user_client_id()
  );

-- CAMPAIGNS policies
create policy "admin_all_campaigns" on public.campaigns
  for all using (public.get_user_role() = 'admin');

create policy "client_own_campaigns" on public.campaigns
  for select using (
    public.get_user_role() = 'client' and client_id = public.get_user_client_id()
  );

-- REPORTS policies
create policy "admin_all_reports" on public.reports
  for all using (public.get_user_role() = 'admin');

create policy "client_own_visible_reports" on public.reports
  for select using (
    public.get_user_role() = 'client'
    and client_id = public.get_user_client_id()
    and visible_to_client = true
  );

-- GOALS policies (admin only)
create policy "admin_all_goals" on public.goals
  for all using (public.get_user_role() = 'admin');

-- MONTHLY PLANS policies
create policy "admin_all_plans" on public.monthly_plans
  for all using (public.get_user_role() = 'admin');

create policy "client_own_plans" on public.monthly_plans
  for select using (
    public.get_user_role() = 'client' and client_id = public.get_user_client_id()
  );

-- ALERTS policies (admin only)
create policy "admin_all_alerts" on public.alerts
  for all using (public.get_user_role() = 'admin');

-- ============================================================
-- HANDLE NEW USER (auto-create public.users row)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
