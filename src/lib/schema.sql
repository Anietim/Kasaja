-- =============================================================
-- KASAJA — Supabase PostgreSQL schema
-- Run this in your Supabase SQL editor to set up the database.
-- =============================================================

-- Enable PostGIS for geographic queries (5km proximity, rider radar)
create extension if not exists postgis;

-- =============================================================
-- SECTION 1: USERS & SOCIAL
-- =============================================================

create table if not exists profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  roles                 text[]    not null default array['buyer'],
  interest_categories   text[]    not null default '{}',
  display_name          text      not null default '',
  phone                 text,
  avatar_url            text,
  bio                   text,
  location_text         text,
  delivery_address_text text,
  delivery_lat          double precision,
  delivery_lng          double precision,
  messaging_banned      boolean   not null default false,
  status                text      not null default 'active'
                          check (status in ('active','suspended','banned')),
  created_at            timestamptz not null default now()
);

create table if not exists follows (
  id           uuid primary key default gen_random_uuid(),
  follower_id  uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique(follower_id, following_id)
);

create table if not exists blocks (
  id          uuid primary key default gen_random_uuid(),
  blocker_id  uuid not null references profiles(id) on delete cascade,
  blocked_id  uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique(blocker_id, blocked_id)
);

create table if not exists mutes (
  id        uuid primary key default gen_random_uuid(),
  muter_id  uuid not null references profiles(id) on delete cascade,
  muted_id  uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(muter_id, muted_id)
);

create table if not exists reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references profiles(id) on delete cascade,
  reported_id  uuid not null references profiles(id) on delete cascade,
  reason       text not null check (reason in ('fraud','fake_listing','harassment','spam','other')),
  description  text,
  status       text not null default 'open' check (status in ('open','reviewed','resolved')),
  created_at   timestamptz not null default now()
);

-- =============================================================
-- SECTION 2: MARKET DIRECTORY
-- =============================================================

create table if not exists states (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists markets (
  id        uuid primary key default gen_random_uuid(),
  state_id  uuid not null references states(id) on delete cascade,
  name      text not null,
  address   text,
  lat       double precision,
  lng       double precision,
  is_active boolean not null default true,
  unique(state_id, name)
);

create table if not exists store_markets (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null,
  market_id    uuid not null references markets(id) on delete cascade,
  stall_number text,
  unique(store_id, market_id)
);

create table if not exists market_follows (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  market_id  uuid not null references markets(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, market_id)
);

-- =============================================================
-- SECTION 3: STORES & PRODUCTS
-- =============================================================

create table if not exists stores (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references profiles(id) on delete cascade,
  name               text not null,
  description        text,
  category           text not null default 'Other',
  logo_url           text,
  banner_url         text,
  location_text      text,
  location_lat       double precision,
  location_lng       double precision,
  verified_until     timestamptz,
  ad_active_until    timestamptz,
  avg_rating         numeric(3,2) not null default 0,
  rating_count       integer      not null default 0,
  trending_score     numeric(10,4) not null default 0,
  accepts_refunds    boolean      not null default true,
  refund_window_days integer      not null default 7,
  refund_policy_text text,
  is_active          boolean      not null default true,
  created_at         timestamptz  not null default now()
);

-- Add store_id FK for store_markets now that stores exists
alter table store_markets
  add constraint store_markets_store_id_fkey
  foreign key (store_id) references stores(id) on delete cascade;

create table if not exists products (
  id             uuid primary key default gen_random_uuid(),
  store_id       uuid not null references stores(id) on delete cascade,
  name           text not null,
  description    text,
  base_price_ngn numeric(12,2) not null default 0,
  price_type     text not null default 'fixed' check (price_type in ('fixed','negotiable')),
  media_urls     text[] not null default '{}',
  location_text  text,
  is_available   boolean not null default true,
  created_at     timestamptz not null default now()
);

create table if not exists product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  label       text not null,
  price_ngn   numeric(12,2) not null,
  stock_qty   integer not null default 0,
  is_available boolean not null default true
);

create table if not exists product_likes (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(product_id, user_id)
);

create table if not exists product_comments (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists wishlists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  added_at   timestamptz not null default now(),
  unique(user_id, product_id)
);

create table if not exists seller_posts (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references stores(id) on delete cascade,
  caption    text,
  media_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists store_ratings (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  buyer_id    uuid not null references profiles(id) on delete cascade,
  order_id    uuid not null,
  score       integer not null check (score between 1 and 5),
  review_text text,
  created_at  timestamptz not null default now(),
  unique(store_id, buyer_id, order_id)
);

create table if not exists subscriptions (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references stores(id) on delete cascade,
  type         text not null check (type in ('verified','ad')),
  tier         text not null,
  amount_ngn   numeric(12,2) not null,
  paystack_ref text,
  active_until timestamptz not null,
  created_at   timestamptz not null default now()
);

-- =============================================================
-- SECTION 4: ORDERS & DELIVERY
-- =============================================================

create table if not exists orders (
  id             uuid primary key default gen_random_uuid(),
  buyer_id       uuid not null references profiles(id) on delete restrict,
  store_id       uuid not null references stores(id) on delete restrict,
  items          jsonb not null default '[]',
  total_ngn      numeric(12,2) not null,
  paystack_ref   text,
  status         text not null default 'pending'
                   check (status in ('pending','paid','completed','refunded','disputed','cancelled')),
  payment_route  text not null default 'kaja_escrow'
                   check (payment_route in ('kaja_escrow','direct_bank')),
  escrow_opted_in boolean not null default true,
  created_at     timestamptz not null default now()
);

create table if not exists delivery_jobs (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid references orders(id) on delete set null,
  buyer_id              uuid not null references profiles(id) on delete cascade,
  rider_id              uuid references profiles(id) on delete set null,
  buyer_offered_price_ngn numeric(10,2) not null,
  agreed_price_ngn      numeric(10,2),
  status                text not null default 'open'
                          check (status in ('open','counter_offered','agreed','locked','in_transit','completed','cancelled')),
  escrow_ref            text,
  pickup_address_text   text not null,
  pickup_lat            double precision,
  pickup_lng            double precision,
  dropoff_address_text  text not null,
  dropoff_lat           double precision,
  dropoff_lng           double precision,
  expires_at            timestamptz,
  created_at            timestamptz not null default now(),
  accepted_at           timestamptz,
  confirmed_at          timestamptz
);

create table if not exists delivery_bids (
  id                   uuid primary key default gen_random_uuid(),
  job_id               uuid not null references delivery_jobs(id) on delete cascade,
  rider_id             uuid not null references profiles(id) on delete cascade,
  proposed_amount_ngn  numeric(10,2) not null,
  status               text not null default 'pending'
                         check (status in ('pending','accepted','declined')),
  created_at           timestamptz not null default now()
);

create table if not exists rider_locations (
  rider_id   uuid primary key references profiles(id) on delete cascade,
  lat        double precision not null,
  lng        double precision not null,
  is_online  boolean not null default false,
  updated_at timestamptz not null default now()
);

-- =============================================================
-- SECTION 5: WALLET & LEDGER
-- =============================================================

create table if not exists wallet_balances (
  user_id                   uuid primary key references profiles(id) on delete cascade,
  withdrawable_balance_kobo bigint not null default 0,
  flagged_balance_kobo      bigint not null default 0,
  total_balance_kobo        bigint not null default 0,
  constraint balance_integrity
    check (total_balance_kobo = withdrawable_balance_kobo + flagged_balance_kobo)
);

create table if not exists wallet_transactions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade,
  type              text not null check (type in (
    'credit','debit','cashback','streak_bonus','sticker_gift',
    'sticker_conversion','stash_return','kaja_spend','kaja_receive',
    'platform_commission','withdrawal_reversal','withdrawal_blocked','flag'
  )),
  amount_kobo       bigint not null check (amount_kobo <= 10000000), -- ₦100k cap
  parent_tx_id      text not null,
  parent_tx_source  text not null check (parent_tx_source in (
    'paystack_webhook','monnify_webhook','escrow_settlement',
    'cashback','streak_bonus','sticker_gift','sticker_conversion',
    'stash_return','kaja_spend','kaja_receive','platform_commission','withdrawal_reversal'
  )),
  tx_hash           text not null,
  description       text,
  created_at        timestamptz not null default now()
);

-- wallet_transactions is INSERT-only (enforced at app level + RLS)

-- =============================================================
-- SECTION 6: CHAT & MESSAGING
-- =============================================================

create table if not exists conversations (
  id              uuid primary key default gen_random_uuid(),
  participant_ids uuid[] not null,
  order_id        uuid references orders(id) on delete set null,
  source          text not null default 'direct'
                    check (source in ('direct','group_reply','post_purchase')),
  created_at      timestamptz not null default now(),
  deleted_at_by   jsonb not null default '{}'
);

create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references profiles(id) on delete cascade,
  type            text not null default 'text'
                    check (type in ('text','image','video','file','offer','call_incoming','call_summary')),
  content         text,
  media_urls      text[] not null default '{}',
  offer_amount_ngn numeric(12,2),
  sent_at         timestamptz not null default now(),
  deleted_by      uuid[] not null default '{}'
);

-- =============================================================
-- SECTION 7: MARKET GROUPS
-- =============================================================

create table if not exists groups (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  type             text not null default 'market'
                     check (type in ('market','category','city')),
  market_id        uuid references markets(id) on delete set null,
  description      text,
  cover_image_url  text,
  daily_price_ngn  numeric(10,2) not null default 100,
  weekly_price_ngn numeric(10,2) not null default 500,
  monthly_price_ngn numeric(10,2) not null default 1500,
  is_active        boolean not null default true
);

create table if not exists group_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  group_id     uuid not null references groups(id) on delete cascade,
  tier         text not null check (tier in ('daily','weekly','monthly')),
  paystack_ref text,
  amount_ngn   numeric(10,2) not null,
  subscribed_at timestamptz not null default now(),
  expires_at   timestamptz not null,
  unique(user_id, group_id)
);

create table if not exists group_members (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references groups(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  role       text not null check (role in ('buyer','seller')),
  expires_at timestamptz not null,
  is_active  boolean not null default true,
  unique(group_id, user_id)
);

create table if not exists group_posts (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups(id) on delete cascade,
  poster_id   uuid not null references profiles(id) on delete cascade,
  description text not null,
  media_urls  text[] not null default '{}',
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create table if not exists group_replies (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references group_posts(id) on delete cascade,
  seller_id    uuid not null references profiles(id) on delete cascade,
  price_ngn    numeric(12,2) not null,
  availability text not null default 'in_stock'
                 check (availability in ('in_stock','can_source')),
  note         text,
  media_urls   text[] not null default '{}',
  created_at   timestamptz not null default now()
);

-- =============================================================
-- SECTION 8: ADMIN
-- =============================================================

create table if not exists admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null references profiles(id) on delete cascade,
  action      text not null,
  target_type text not null,
  target_id   uuid,
  note        text,
  created_at  timestamptz not null default now()
);

-- =============================================================
-- SECTION 9: INDEXES
-- =============================================================

create index if not exists idx_products_store          on products(store_id);
create index if not exists idx_products_available      on products(is_available) where is_available = true;
create index if not exists idx_stores_owner            on stores(owner_id);
create index if not exists idx_stores_trending         on stores(trending_score desc);
create index if not exists idx_stores_ad               on stores(ad_active_until) where ad_active_until is not null;
create index if not exists idx_delivery_jobs_buyer     on delivery_jobs(buyer_id);
create index if not exists idx_delivery_jobs_status    on delivery_jobs(status);
create index if not exists idx_messages_conversation   on messages(conversation_id, sent_at desc);
create index if not exists idx_group_posts_group       on group_posts(group_id, created_at desc);
create index if not exists idx_product_likes_product   on product_likes(product_id);
create index if not exists idx_follows_follower        on follows(follower_id);
create index if not exists idx_follows_following       on follows(following_id);

-- =============================================================
-- SECTION 10: ROW LEVEL SECURITY
-- =============================================================

alter table profiles             enable row level security;
alter table stores               enable row level security;
alter table products             enable row level security;
alter table product_variants     enable row level security;
alter table product_likes        enable row level security;
alter table product_comments     enable row level security;
alter table wishlists            enable row level security;
alter table seller_posts         enable row level security;
alter table store_ratings        enable row level security;
alter table orders               enable row level security;
alter table delivery_jobs        enable row level security;
alter table delivery_bids        enable row level security;
alter table rider_locations      enable row level security;
alter table wallet_balances      enable row level security;
alter table wallet_transactions  enable row level security;
alter table conversations        enable row level security;
alter table messages             enable row level security;
alter table group_subscriptions  enable row level security;
alter table group_members        enable row level security;
alter table group_posts          enable row level security;
alter table group_replies        enable row level security;
alter table wishlists            enable row level security;
alter table follows              enable row level security;
alter table blocks               enable row level security;
alter table admin_audit_log      enable row level security;

-- Profiles: viewable by all auth users; own profile editable
create policy "profiles_select_all"  on profiles for select using (auth.uid() is not null);
create policy "profiles_insert_own"  on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own"  on profiles for update using (auth.uid() = id);

-- Stores: viewable by all; insertable/updatable by owner
create policy "stores_select_all"    on stores for select using (true);
create policy "stores_insert_owner"  on stores for insert with check (auth.uid() = owner_id);
create policy "stores_update_owner"  on stores for update using (auth.uid() = owner_id);

-- Products: viewable by all; manageable by store owner
create policy "products_select_all"  on products for select using (true);
create policy "products_insert_owner" on products for insert
  with check (exists (select 1 from stores where id = store_id and owner_id = auth.uid()));
create policy "products_update_owner" on products for update
  using (exists (select 1 from stores where id = store_id and owner_id = auth.uid()));

-- Product likes: viewable by all; own likes manageable
create policy "likes_select_all"   on product_likes for select using (true);
create policy "likes_insert_own"   on product_likes for insert with check (auth.uid() = user_id);
create policy "likes_delete_own"   on product_likes for delete using (auth.uid() = user_id);

-- Wishlists: only the owner sees their own
create policy "wishlist_own"  on wishlists for all using (auth.uid() = user_id);

-- Wallet balances: only the owner
create policy "wallet_own"    on wallet_balances for select using (auth.uid() = user_id);

-- Wallet transactions: INSERT only for authenticated users; own SELECT
create policy "wtx_select_own"  on wallet_transactions for select using (auth.uid() = user_id);
create policy "wtx_insert"      on wallet_transactions for insert with check (auth.uid() = user_id);

-- Orders: buyer and store owner can see
create policy "orders_select"  on orders for select
  using (auth.uid() = buyer_id or
         exists (select 1 from stores where id = store_id and owner_id = auth.uid()));
create policy "orders_insert"  on orders for insert with check (auth.uid() = buyer_id);

-- Delivery jobs: buyer and assigned/potential riders can see
create policy "djobs_select"   on delivery_jobs for select using (auth.uid() is not null);
create policy "djobs_insert"   on delivery_jobs for insert with check (auth.uid() = buyer_id);
create policy "djobs_update"   on delivery_jobs for update
  using (auth.uid() = buyer_id or auth.uid() = rider_id);

-- Delivery bids: viewable by job buyer and bidding riders
create policy "dbids_select"   on delivery_bids for select using (auth.uid() is not null);
create policy "dbids_insert"   on delivery_bids for insert with check (auth.uid() = rider_id);

-- Rider locations: riders update their own; buyers can read online riders
create policy "rloc_select"    on rider_locations for select using (auth.uid() is not null);
create policy "rloc_upsert"    on rider_locations for insert with check (auth.uid() = rider_id);
create policy "rloc_update"    on rider_locations for update using (auth.uid() = rider_id);

-- Conversations: participants only
create policy "conv_select"   on conversations for select
  using (auth.uid() = any(participant_ids));
create policy "conv_insert"   on conversations for insert
  with check (auth.uid() = any(participant_ids));
create policy "conv_update"   on conversations for update
  using (auth.uid() = any(participant_ids));

-- Messages: participants only
create policy "msg_select"    on messages for select
  using (exists (select 1 from conversations where id = conversation_id and auth.uid() = any(participant_ids)));
create policy "msg_insert"    on messages for insert
  with check (exists (select 1 from conversations where id = conversation_id and auth.uid() = any(participant_ids)) and auth.uid() = sender_id);
create policy "msg_update_own" on messages for update
  using (auth.uid() = sender_id);

-- Groups: viewable by all; posts/replies require active subscription (enforced in app)
create policy "groups_select"        on group_subscriptions for select using (auth.uid() = user_id);
create policy "groups_sub_insert"    on group_subscriptions for insert with check (auth.uid() = user_id);
create policy "group_posts_select"   on group_posts for select using (auth.uid() is not null);
create policy "group_posts_insert"   on group_posts for insert with check (auth.uid() = poster_id);
create policy "group_replies_select" on group_replies for select using (auth.uid() is not null);
create policy "group_replies_insert" on group_replies for insert with check (auth.uid() = seller_id);

-- Follows
create policy "follows_select"  on follows for select using (auth.uid() is not null);
create policy "follows_insert"  on follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete"  on follows for delete using (auth.uid() = follower_id);

-- Blocks
create policy "blocks_select"   on blocks for select using (auth.uid() = blocker_id);
create policy "blocks_insert"   on blocks for insert with check (auth.uid() = blocker_id);
create policy "blocks_delete"   on blocks for delete using (auth.uid() = blocker_id);

-- Admin audit log: admins only (checked at app level)
create policy "audit_insert"    on admin_audit_log for insert with check (auth.uid() is not null);
create policy "audit_select"    on admin_audit_log for select using (auth.uid() is not null);

-- =============================================================
-- SECTION 11: SEED DATA — Nigerian states
-- =============================================================

insert into states (name) values
  ('Abia'), ('Adamawa'), ('Akwa Ibom'), ('Anambra'), ('Bauchi'),
  ('Bayelsa'), ('Benue'), ('Borno'), ('Cross River'), ('Delta'),
  ('Ebonyi'), ('Edo'), ('Ekiti'), ('Enugu'), ('FCT Abuja'),
  ('Gombe'), ('Imo'), ('Jigawa'), ('Kaduna'), ('Kano'),
  ('Katsina'), ('Kebbi'), ('Kogi'), ('Kwara'), ('Lagos'),
  ('Nasarawa'), ('Niger'), ('Ogun'), ('Ondo'), ('Osun'),
  ('Oyo'), ('Plateau'), ('Rivers'), ('Sokoto'), ('Taraba'),
  ('Yobe'), ('Zamfara')
on conflict do nothing;

-- =============================================================
-- SECTION 12: SEED DATA — Lagos markets
-- =============================================================

insert into markets (state_id, name, address, lat, lng)
select s.id, m.name, m.address, m.lat, m.lng
from states s,
(values
  ('Balogun Market',             'Lagos Island, Lagos',         6.4550,  3.3947),
  ('Mandilas Market',            'Lagos Island, Lagos',         6.4530,  3.3960),
  ('Computer Village',           'Ikeja, Lagos',                6.6018,  3.3515),
  ('Alaba International Market', 'Ojo, Lagos',                  6.4717,  3.2063),
  ('Trade Fair Complex',         'Ojo, Lagos',                  6.4800,  3.2100),
  ('Mile 12 Market',             'Kosofe, Lagos',               6.6190,  3.3940),
  ('Idumota Market',             'Lagos Island, Lagos',         6.4565,  3.3963),
  ('Oshodi Market',              'Oshodi, Lagos',               6.5530,  3.3460),
  ('Tejuosho Market',            'Yaba, Lagos',                 6.5090,  3.3750),
  ('Yaba Market',                'Yaba, Lagos',                 6.5070,  3.3770),
  ('Lekki Market',               'Lekki, Lagos',                6.4380,  3.4760),
  ('Sangotedo Market',           'Ajah, Lagos',                 6.4340,  3.5540),
  ('Mushin Market',              'Mushin, Lagos',               6.5390,  3.3570),
  ('Oyingbo Market',             'Ebute Meta, Lagos',           6.4810,  3.3880),
  ('Mile 2 Market',              'Amuwo-Odofin, Lagos',         6.4690,  3.2980)
) as m(name, address, lat, lng)
where s.name = 'Lagos'
on conflict do nothing;

-- Abuja markets
insert into markets (state_id, name, address, lat, lng)
select s.id, m.name, m.address, m.lat, m.lng
from states s,
(values
  ('Wuse Market',    'Wuse, Abuja',    9.0640, 7.4510),
  ('Garki Market',   'Garki, Abuja',   9.0480, 7.4790),
  ('Nyanya Market',  'Nyanya, Abuja',  8.9990, 7.5390),
  ('Mararaba Market','Mararaba, Abuja', 8.9720, 7.5570)
) as m(name, address, lat, lng)
where s.name = 'FCT Abuja'
on conflict do nothing;

-- Rivers markets
insert into markets (state_id, name, address, lat, lng)
select s.id, m.name, m.address, m.lat, m.lng
from states s,
(values
  ('Mile 3 Market',   'Port Harcourt, Rivers',  4.8156, 7.0498),
  ('Rumuola Market',  'Port Harcourt, Rivers',  4.8370, 7.0660),
  ('Oil Mill Market', 'Port Harcourt, Rivers',  4.7740, 7.0130)
) as m(name, address, lat, lng)
where s.name = 'Rivers'
on conflict do nothing;

-- Kano markets
insert into markets (state_id, name, address, lat, lng)
select s.id, m.name, m.address, m.lat, m.lng
from states s,
(values
  ('Kantin Kwari Market', 'Kano City, Kano', 12.0022, 8.5920),
  ('Singer Market',       'Kano City, Kano', 11.9980, 8.5800),
  ('Sabon Gari Market',   'Sabon Gari, Kano',12.0110, 8.5410)
) as m(name, address, lat, lng)
where s.name = 'Kano'
on conflict do nothing;

-- =============================================================
-- SECTION 13: SEED DATA — Sample market groups (Lagos)
-- =============================================================

insert into groups (name, type, market_id, description, daily_price_ngn, weekly_price_ngn, monthly_price_ngn)
select
  'Balogun Market Buyers Group',
  'market',
  m.id,
  'Find the best deals from Balogun Market traders. Post what you want — sellers reply with prices.',
  100, 500, 1500
from markets m where m.name = 'Balogun Market'
on conflict do nothing;

insert into groups (name, type, market_id, description, daily_price_ngn, weekly_price_ngn, monthly_price_ngn)
select
  'Computer Village Deals',
  'market',
  m.id,
  'Phones, laptops, accessories and electronics from Computer Village Ikeja.',
  100, 500, 1500
from markets m where m.name = 'Computer Village'
on conflict do nothing;

insert into groups (name, type, description, daily_price_ngn, weekly_price_ngn, monthly_price_ngn)
values
  ('Lagos Fashion & Fabrics', 'category',
   'Fashion, clothing, fabrics, and accessories from Lagos market sellers.', 100, 500, 1500),
  ('Lagos Best Deals', 'city',
   'Hot deals from all Lagos markets. Any category welcome.', 100, 500, 1500),
  ('Abuja Buyers Group', 'city',
   'Buyers and sellers across FCT Abuja markets.', 100, 500, 1500)
on conflict do nothing;
