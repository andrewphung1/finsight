-- Create portfolio snapshots for historical tracking
create table if not exists public.portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null,
  total_value decimal(15,4) not null,
  total_cost_basis decimal(15,4) not null,
  total_return decimal(15,4) not null,
  return_percentage decimal(8,4) not null,
  holdings jsonb not null, -- Store current holdings as JSON
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on portfolio snapshots
alter table public.portfolio_snapshots enable row level security;

-- RLS policies for portfolio snapshots
create policy "portfolio_snapshots_select_own"
  on public.portfolio_snapshots for select
  using (auth.uid() = user_id);

create policy "portfolio_snapshots_insert_own"
  on public.portfolio_snapshots for insert
  with check (auth.uid() = user_id);

create policy "portfolio_snapshots_update_own"
  on public.portfolio_snapshots for update
  using (auth.uid() = user_id);

create policy "portfolio_snapshots_delete_own"
  on public.portfolio_snapshots for delete
  using (auth.uid() = user_id);

-- Create indexes
create index if not exists portfolio_snapshots_user_id_idx on public.portfolio_snapshots(user_id);
create index if not exists portfolio_snapshots_date_idx on public.portfolio_snapshots(snapshot_date);

-- Create unique constraint to prevent duplicate snapshots per user per date
create unique index if not exists portfolio_snapshots_user_date_unique 
  on public.portfolio_snapshots(user_id, snapshot_date);
