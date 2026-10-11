-- ============================================================
-- KASAJA DATABASE SCHEMA
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New query
-- ============================================================

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
create type user_role as enum ('buyer','seller','rider','admin','investigation_admin','super_admin');
create type store_status as enum ('pending','active','suspended');
create type product_status as enum ('draft','active','sold_out','archived');
create type price_type as enum ('fixed','negotiable');
create type order_status as enum ('pending','paid','processing','dispatched','delivered','completed','cancelled','refunded','disputed');
create type payment_route as enum ('kaja_escrow','direct_bank','paystack_direct');
create type delivery_mode as enum ('local_dispatch','interstate_individual','interstate_corporate');
create type delivery_status as enum ('pending','accepted','picked_up','in_transit','delivered','cancelled');
create type bid_status as enum ('open','accepted','rejected','expired');
create type message_type as enum ('text','image','video','audio','offer','system');
create type group_tier as enum ('daily','weekly','monthly');
create type post_type as enum ('want_request','reply');
create type verification_tier as enum ('basic','verified','premium');
create type ad_placement as enum ('feed_top','feed_mid','market_banner','category_banner');
create type dispute_status as enum ('open','investigating','resolved','escalated');
create type tx_source as enum ('paystack_webhook','monnify_webhook','platform_payout','escrow_release','sticker_payout','refund','commission_deduction','subscription_deduction','ad_deduction','withdrawal');
create type withdrawal_status as enum ('pending','processing','completed','failed','flagged');
create type notification_type as enum ('order','delivery','message','payment','system','promo');

-- ============================================================
-- PROFILES
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique,
  display_name text not null default '',
  avatar_url text,
  bio text,
  roles user_role[] not null default '{buyer}',
  state text,
  lga text,
  address text,
  is_verified boolean not null default false,
  is_banned boolean not null default false,
  kaja_balance_kobo bigint not null default 0,
  kaja_flagged_kobo bigint not null default 0,
  cashback_kobo bigint not null default 0,
  interests text[] default '{}',
  followers_count int not null default 0,
  following_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- FOLLOWS
-- ============================================================
create table follows (
  follower_id uuid references profiles(id) on delete cascade,
  following_id uuid references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

-- ============================================================
-- NIGERIA GEOGRAPHY
-- ============================================================
create table ng_states (
  id serial primary key,
  name text not null unique,
  code text not null unique,
  region text not null
);

create table ng_markets (
  id serial primary key,
  state_id int references ng_states(id),
  name text not null,
  slug text not null unique,
  description text,
  speciality text[],
  address text,
  lat numeric(10,7),
  lng numeric(10,7),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- STORES
-- ============================================================
create table stores (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references profiles(id) on delete cascade,
  market_id int references ng_markets(id),
  name text not null,
  slug text unique,
  description text,
  logo_url text,
  cover_url text,
  state text,
  lga text,
  address text,
  phone text,
  whatsapp text,
  status store_status not null default 'pending',
  verification_tier verification_tier not null default 'basic',
  verification_expires_at timestamptz,
  avg_rating numeric(3,2) not null default 0,
  rating_count int not null default 0,
  trending_score numeric(10,4) not null default 0,
  followers_count int not null default 0,
  total_sales int not null default 0,
  is_trending boolean not null default false,
  secured_store boolean not null default false,
  bank_name text,
  bank_account_number text,
  bank_account_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
create table products (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references stores(id) on delete cascade,
  title text not null,
  description text,
  price_kobo bigint not null default 0,
  price_type price_type not null default 'fixed',
  min_price_kobo bigint,
  category text not null,
  subcategory text,
  images text[] not null default '{}',
  video_url text,
  variants jsonb default '[]',
  status product_status not null default 'active',
  stock_count int,
  likes_count int not null default 0,
  views_count int not null default 0,
  orders_count int not null default 0,
  is_flash_deal boolean not null default false,
  flash_price_kobo bigint,
  flash_expires_at timestamptz,
  condition text not null default 'new',
  weight_kg numeric(8,3),
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table product_likes (
  user_id uuid references profiles(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table product_comments (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table wishlists (
  user_id uuid references profiles(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ============================================================
-- ORDERS
-- ============================================================
create table orders (
  id uuid primary key default uuid_generate_v4(),
  buyer_id uuid not null references profiles(id),
  store_id uuid not null references stores(id),
  product_id uuid not null references products(id),
  variant jsonb,
  quantity int not null default 1,
  unit_price_kobo bigint not null,
  total_kobo bigint not null,
  commission_kobo bigint not null default 0,
  cashback_kobo bigint not null default 0,
  status order_status not null default 'pending',
  payment_route payment_route not null default 'paystack_direct',
  escrow_opted_in boolean not null default true,
  escrow_held_kobo bigint not null default 0,
  paystack_ref text,
  delivery_id uuid,
  buyer_confirmed_at timestamptz,
  seller_rating int check (seller_rating between 1 and 5),
  seller_review text,
  dispute_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- DELIVERY
-- ============================================================
create table delivery_requests (
  id uuid primary key default uuid_generate_v4(),
  requester_id uuid not null references profiles(id),
  order_id uuid references orders(id),
  pickup_address text not null,
  pickup_lat numeric(10,7),
  pickup_lng numeric(10,7),
  dropoff_address text not null,
  dropoff_lat numeric(10,7),
  dropoff_lng numeric(10,7),
  item_description text,
  item_weight_kg numeric(8,3),
  mode delivery_mode not null default 'local_dispatch',
  status delivery_status not null default 'pending',
  accepted_bid_id uuid,
  rider_id uuid references profiles(id),
  agreed_fee_kobo bigint,
  escrow_held_kobo bigint not null default 0,
  pickup_code text,
  dropoff_code text,
  rider_lat numeric(10,7),
  rider_lng numeric(10,7),
  rider_last_seen timestamptz,
  pickup_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table delivery_bids (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid not null references delivery_requests(id) on delete cascade,
  rider_id uuid not null references profiles(id),
  amount_kobo bigint not null,
  message text,
  status bid_status not null default 'open',
  created_at timestamptz not null default now()
);

create table rider_profiles (
  id uuid primary key references profiles(id) on delete cascade,
  vehicle_type text not null default 'motorcycle',
  vehicle_plate text,
  nin text,
  bvn text,
  is_online boolean not null default false,
  current_lat numeric(10,7),
  current_lng numeric(10,7),
  last_seen timestamptz,
  avg_rating numeric(3,2) not null default 0,
  rating_count int not null default 0,
  total_deliveries int not null default 0,
  streak_count int not null default 0,
  streak_bonus_kobo bigint not null default 0,
  wallet_balance_kobo bigint not null default 0,
  bank_name text,
  bank_account_number text,
  bank_account_name text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- CONVERSATIONS & MESSAGES
-- ============================================================
create table conversations (
  id uuid primary key default uuid_generate_v4(),
  participant_a uuid not null references profiles(id),
  participant_b uuid not null references profiles(id),
  last_message text,
  last_message_at timestamptz,
  unread_a int not null default 0,
  unread_b int not null default 0,
  is_deleted_a boolean not null default false,
  is_deleted_b boolean not null default false,
  created_at timestamptz not null default now(),
  unique(participant_a, participant_b)
);

create table messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id),
  sender_id uuid not null references profiles(id),
  type message_type not null default 'text',
  content text,
  media_url text,
  offer_amount_kobo bigint,
  offer_status text,
  is_deleted_sender boolean not null default false,
  is_deleted_receiver boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- MARKET GROUPS
-- ============================================================
create table market_groups (
  id uuid primary key default uuid_generate_v4(),
  market_id int not null references ng_markets(id),
  name text not null,
  description text,
  cover_url text,
  member_count int not null default 0,
  post_count int not null default 0,
  daily_fee_kobo bigint not null default 10000,
  weekly_fee_kobo bigint not null default 50000,
  monthly_fee_kobo bigint not null default 150000,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table group_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references market_groups(id),
  user_id uuid not null references profiles(id),
  tier group_tier not null,
  paystack_ref text,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table group_posts (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references market_groups(id),
  author_id uuid not null references profiles(id),
  type post_type not null default 'want_request',
  parent_id uuid references group_posts(id),
  content text not null,
  images text[] default '{}',
  price_kobo bigint,
  is_deleted boolean not null default false,
  reply_count int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ADS & VERIFICATION
-- ============================================================
create table store_ads (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references stores(id) on delete cascade,
  placement ad_placement not null,
  title text not null,
  image_url text,
  target_url text,
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  impressions int not null default 0,
  clicks int not null default 0,
  fee_kobo bigint not null,
  paystack_ref text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- WALLET & TRANSACTIONS
-- ============================================================
create table wallet_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id),
  amount_kobo bigint not null check (amount_kobo != 0),
  balance_after_kobo bigint not null,
  source tx_source not null,
  parent_tx_id uuid references wallet_transactions(id),
  paystack_ref text,
  order_id uuid references orders(id),
  description text not null,
  tx_hash text not null,
  created_at timestamptz not null default now(),
  constraint tx_cap check (abs(amount_kobo) <= 10000000)
);

create table withdrawals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id),
  amount_kobo bigint not null check (amount_kobo > 0 and amount_kobo <= 10000000),
  fee_kobo bigint not null default 0,
  net_kobo bigint not null,
  bank_name text not null,
  account_number text not null,
  account_name text not null,
  status withdrawal_status not null default 'pending',
  paystack_transfer_code text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- DISPUTES
-- ============================================================
create table disputes (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id),
  raised_by uuid not null references profiles(id),
  against uuid not null references profiles(id),
  reason text not null,
  evidence text[] default '{}',
  status dispute_status not null default 'open',
  assigned_admin uuid references profiles(id),
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- REPORTS / BLOCKS
-- ============================================================
create table reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references profiles(id),
  target_user_id uuid references profiles(id),
  target_product_id uuid references products(id),
  reason text not null,
  details text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table blocks (
  blocker_id uuid references profiles(id) on delete cascade,
  blocked_id uuid references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text not null,
  data jsonb default '{}',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- KASAJA STASH (savings buckets - Phase 2)
-- ============================================================
create table stash_buckets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  target_kobo bigint,
  current_kobo bigint not null default 0,
  auto_split_pct numeric(5,2) not null default 0,
  lock_until date,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index on products(store_id);
create index on products(category);
create index on products(status);
create index on products(created_at desc);
create index on orders(buyer_id);
create index on orders(store_id);
create index on orders(status);
create index on messages(conversation_id, created_at);
create index on conversations(participant_a);
create index on conversations(participant_b);
create index on group_posts(group_id, created_at desc);
create index on wallet_transactions(user_id, created_at desc);
create index on notifications(user_id, read);
create index on stores(market_id);
create index on stores(trending_score desc);
create index on delivery_requests(status);
create index on delivery_requests(rider_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table stores enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table messages enable row level security;
alter table conversations enable row level security;
alter table wallet_transactions enable row level security;
alter table notifications enable row level security;
alter table group_posts enable row level security;
alter table group_subscriptions enable row level security;
alter table delivery_requests enable row level security;
alter table delivery_bids enable row level security;

-- Profiles: users can read all, update own
create policy "profiles_read_all" on profiles for select using (true);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);

-- Stores: public read, owner write
create policy "stores_read_all" on stores for select using (true);
create policy "stores_write_own" on stores for all using (auth.uid() = owner_id);

-- Products: public read active, owner write
create policy "products_read_active" on products for select using (status != 'archived');
create policy "products_write_own" on products for all using (
  auth.uid() = (select owner_id from stores where id = store_id)
);

-- Orders: buyer or seller can read
create policy "orders_read_parties" on orders for select using (
  auth.uid() = buyer_id or
  auth.uid() = (select owner_id from stores where id = store_id)
);
create policy "orders_insert_buyer" on orders for insert with check (auth.uid() = buyer_id);
create policy "orders_update_parties" on orders for update using (
  auth.uid() = buyer_id or
  auth.uid() = (select owner_id from stores where id = store_id)
);

-- Messages: participants only
create policy "messages_read_own" on messages for select using (
  auth.uid() = sender_id or
  auth.uid() = (select participant_a from conversations where id = conversation_id) or
  auth.uid() = (select participant_b from conversations where id = conversation_id)
);
create policy "messages_insert_own" on messages for insert with check (auth.uid() = sender_id);

-- Conversations: participants only
create policy "conversations_read_own" on conversations for select using (
  auth.uid() = participant_a or auth.uid() = participant_b
);

-- Wallet transactions: INSERT only, own records
create policy "wallet_tx_read_own" on wallet_transactions for select using (auth.uid() = user_id);
create policy "wallet_tx_insert" on wallet_transactions for insert with check (auth.uid() = user_id);

-- Notifications: own only
create policy "notifications_own" on notifications for all using (auth.uid() = user_id);

-- Group posts: read if subscribed, insert if subscribed
create policy "group_posts_read" on group_posts for select using (true);
create policy "group_posts_insert" on group_posts for insert with check (auth.uid() = author_id);

-- Delivery: requester or rider
create policy "delivery_read" on delivery_requests for select using (
  auth.uid() = requester_id or auth.uid() = rider_id
);
create policy "delivery_insert" on delivery_requests for insert with check (auth.uid() = requester_id);
create policy "delivery_update" on delivery_requests for update using (
  auth.uid() = requester_id or auth.uid() = rider_id
);

create policy "bids_read" on delivery_bids for select using (true);
create policy "bids_insert" on delivery_bids for insert with check (auth.uid() = rider_id);

-- Group subscriptions
create policy "subs_read_own" on group_subscriptions for select using (auth.uid() = user_id);
create policy "subs_insert_own" on group_subscriptions for insert with check (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS: updated_at
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();
create trigger trg_stores_updated before update on stores
  for each row execute function set_updated_at();
create trigger trg_products_updated before update on products
  for each row execute function set_updated_at();
create trigger trg_orders_updated before update on orders
  for each row execute function set_updated_at();
create trigger trg_delivery_updated before update on delivery_requests
  for each row execute function set_updated_at();
create trigger trg_disputes_updated before update on disputes
  for each row execute function set_updated_at();

-- ============================================================
-- FUNCTION: update trending score
-- ============================================================
create or replace function recalc_trending_score(store_id_in uuid)
returns void language plpgsql as $$
begin
  update stores
  set trending_score = avg_rating * ln(rating_count + 1),
      secured_store = (avg_rating >= 4.5 and rating_count >= 10)
  where id = store_id_in;
end; $$;
