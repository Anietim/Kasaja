-- Add soft-delete columns to profiles
alter table profiles
  add column if not exists is_deleted boolean default false,
  add column if not exists deleted_at timestamptz default null,
  add column if not exists deletion_reason text default null;

-- Index for admin queries on deleted accounts
create index if not exists profiles_deleted_idx on profiles(is_deleted, deleted_at)
  where is_deleted = true;

-- Update RLS: hide deleted accounts from public reads
drop policy if exists "public read profiles" on profiles;
create policy "public read profiles" on profiles
  for select using (is_deleted = false or auth.uid() = id);

-- Admin view: super admins can see all deleted accounts
create policy "admin read deleted profiles" on profiles
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
      and 'super_admin' = any(p.roles)
    )
  );

-- Auto-purge job hint (run manually or via pg_cron after 90 days)
-- delete from profiles where is_deleted = true and deleted_at < now() - interval '90 days';

select
  count(*) filter (where is_deleted = false) as active_accounts,
  count(*) filter (where is_deleted = true)  as deleted_accounts
from profiles;
