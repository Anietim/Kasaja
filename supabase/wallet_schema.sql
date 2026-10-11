-- Add bank_accounts field to profiles
alter table profiles
  add column if not exists bank_accounts jsonb default '[]';

-- Add wallet_transactions table if not exists
create table if not exists wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('credit','debit','escrow_hold','escrow_release','pending')),
  amount numeric(12,2) not null check (amount > 0),
  label text not null,
  reference text not null unique,
  status text not null default 'pending' check (status in ('completed','pending','failed')),
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- NEVER allow UPDATE or DELETE on wallet_transactions (append-only ledger)
alter table wallet_transactions enable row level security;

drop policy if exists "own wallet read" on wallet_transactions;
drop policy if exists "own wallet insert" on wallet_transactions;

create policy "own wallet read"   on wallet_transactions for select using (auth.uid() = user_id);
create policy "own wallet insert" on wallet_transactions for insert with check (auth.uid() = user_id);

-- Index
create index if not exists wallet_tx_user_idx on wallet_transactions(user_id, created_at desc);

select 'wallet schema ready' as status;
