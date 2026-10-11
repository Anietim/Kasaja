-- Verification applications table
create table if not exists verification_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('seller', 'rider')),
  status text not null default 'pending' check (status in ('pending', 'under_review', 'approved', 'rejected', 'payment_pending')),

  -- Common fields
  full_name text not null,
  phone text not null,
  state text not null,
  city text not null,
  id_type text not null check (id_type in ('nin', 'bvn', 'drivers_license', 'intl_passport', 'voters_card')),
  id_number text not null,
  id_document_url text,
  selfie_url text,

  -- Seller-specific
  store_name text,
  store_address text,
  business_type text,
  cac_number text,
  cac_document_url text,
  tax_id text,

  -- Rider-specific
  vehicle_type text,
  vehicle_make text,
  vehicle_model text,
  plate_number text,
  vehicle_document_url text,
  guarantor_name text,
  guarantor_phone text,
  guarantor_address text,

  -- Payment
  payment_ref text,
  payment_amount numeric(10,2),
  payment_confirmed boolean default false,

  -- Admin review
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  admin_notes text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table verification_applications enable row level security;
drop policy if exists "own verification read" on verification_applications;
drop policy if exists "own verification write" on verification_applications;
drop policy if exists "admin verification read" on verification_applications;
create policy "own verification read" on verification_applications for select using (auth.uid() = user_id);
create policy "own verification write" on verification_applications for insert with check (auth.uid() = user_id);
create policy "own verification update" on verification_applications for update using (auth.uid() = user_id);

-- Add verification status to profiles
alter table profiles add column if not exists seller_verified boolean default false;
alter table profiles add column if not exists rider_verified boolean default false;
alter table profiles add column if not exists verification_status text default 'unverified';

create index if not exists verif_user_idx on verification_applications(user_id);
create index if not exists verif_status_idx on verification_applications(status);

select 'verification schema ready' as status;
