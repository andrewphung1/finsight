-- Create transactions table for trading history
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null,
  transaction_date date not null,
  quantity decimal(15,4) not null,
  price decimal(15,4) not null,
  transaction_type text not null check (transaction_type in ('buy', 'sell')),
  total_value decimal(15,4) generated always as (quantity * price) stored,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on transactions
alter table public.transactions enable row level security;

-- RLS policies for transactions
create policy "transactions_select_own"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "transactions_insert_own"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "transactions_update_own"
  on public.transactions for update
  using (auth.uid() = user_id);

create policy "transactions_delete_own"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- Create indexes for better performance
create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists transactions_ticker_idx on public.transactions(ticker);
create index if not exists transactions_date_idx on public.transactions(transaction_date);
