-- ============================================================
-- KASAJA RLS POLICIES — safe to re-run (drops before creating)
-- Paste entire file into Supabase SQL Editor → Run
-- ============================================================

-- ---- ng_states ----
alter table ng_states enable row level security;
drop policy if exists "public read states" on ng_states;
create policy "public read states" on ng_states for select using (true);

-- ---- ng_markets ----
alter table ng_markets enable row level security;
drop policy if exists "public read markets" on ng_markets;
create policy "public read markets" on ng_markets for select using (true);

-- ---- profiles ----
alter table profiles enable row level security;
drop policy if exists "public read profiles" on profiles;
drop policy if exists "own profile write" on profiles;
create policy "public read profiles" on profiles for select using (true);
create policy "own profile write" on profiles for all using (auth.uid() = id);

-- ---- stores ----
alter table stores enable row level security;
drop policy if exists "public read stores" on stores;
drop policy if exists "owner write stores" on stores;
create policy "public read stores" on stores for select using (true);
create policy "owner write stores" on stores for all using (auth.uid() = owner_id);

-- ---- products ----
alter table products enable row level security;
drop policy if exists "public read products" on products;
drop policy if exists "store owner write products" on products;
create policy "public read products" on products for select using (true);
create policy "store owner write products" on products for all
  using (exists (select 1 from stores where stores.id = store_id and stores.owner_id = auth.uid()));

-- ---- product_likes ----
alter table product_likes enable row level security;
drop policy if exists "auth read likes" on product_likes;
drop policy if exists "own likes write" on product_likes;
create policy "auth read likes" on product_likes for select using (true);
create policy "own likes write" on product_likes for all using (auth.uid() = user_id);

-- ---- product_comments ----
alter table product_comments enable row level security;
drop policy if exists "public read comments" on product_comments;
drop policy if exists "auth write comments" on product_comments;
create policy "public read comments" on product_comments for select using (true);
create policy "auth write comments" on product_comments for insert with check (auth.uid() = user_id);

-- ---- wishlists ----
alter table wishlists enable row level security;
drop policy if exists "own wishlist" on wishlists;
create policy "own wishlist" on wishlists for all using (auth.uid() = user_id);

-- ---- orders ----
alter table orders enable row level security;
drop policy if exists "buyer or store owner read orders" on orders;
drop policy if exists "buyer create orders" on orders;
drop policy if exists "buyer or store update orders" on orders;
create policy "buyer or store owner read orders" on orders for select
  using (
    auth.uid() = buyer_id or
    exists (select 1 from stores where stores.id = store_id and stores.owner_id = auth.uid())
  );
create policy "buyer create orders" on orders for insert with check (auth.uid() = buyer_id);
create policy "buyer or store update orders" on orders for update
  using (
    auth.uid() = buyer_id or
    exists (select 1 from stores where stores.id = store_id and stores.owner_id = auth.uid())
  );

-- ---- delivery_requests ----
alter table delivery_requests enable row level security;
drop policy if exists "requester or rider read delivery" on delivery_requests;
drop policy if exists "auth create delivery" on delivery_requests;
drop policy if exists "requester or rider update delivery" on delivery_requests;
create policy "requester or rider read delivery" on delivery_requests for select
  using (auth.uid() = requester_id or auth.uid() = rider_id or auth.role() = 'authenticated');
create policy "auth create delivery" on delivery_requests for insert with check (auth.uid() = requester_id);
create policy "requester or rider update delivery" on delivery_requests for update
  using (auth.uid() = requester_id or auth.uid() = rider_id);

-- ---- delivery_bids ----
alter table delivery_bids enable row level security;
drop policy if exists "auth read bids" on delivery_bids;
drop policy if exists "rider create bid" on delivery_bids;
create policy "auth read bids" on delivery_bids for select using (auth.role() = 'authenticated');
create policy "rider create bid" on delivery_bids for insert with check (auth.uid() = rider_id);

-- ---- rider_profiles ----
alter table rider_profiles enable row level security;
drop policy if exists "public read rider profiles" on rider_profiles;
drop policy if exists "own rider profile write" on rider_profiles;
create policy "public read rider profiles" on rider_profiles for select using (true);
create policy "own rider profile write" on rider_profiles for all using (auth.uid() = id);

-- ---- conversations ----
alter table conversations enable row level security;
drop policy if exists "participant read conv" on conversations;
drop policy if exists "auth create conv" on conversations;
drop policy if exists "participant update conv" on conversations;
create policy "participant read conv" on conversations for select
  using (auth.uid() = participant_a or auth.uid() = participant_b);
create policy "auth create conv" on conversations for insert with check (auth.uid() = participant_a);
create policy "participant update conv" on conversations for update
  using (auth.uid() = participant_a or auth.uid() = participant_b);

-- ---- messages ----
alter table messages enable row level security;
drop policy if exists "participant read messages" on messages;
drop policy if exists "sender write messages" on messages;
create policy "participant read messages" on messages for select
  using (exists (
    select 1 from conversations c
    where c.id = conversation_id
    and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
  ));
create policy "sender write messages" on messages for insert with check (auth.uid() = sender_id);

-- ---- market_groups ----
alter table market_groups enable row level security;
drop policy if exists "public read groups" on market_groups;
create policy "public read groups" on market_groups for select using (true);

-- ---- group_subscriptions ----
alter table group_subscriptions enable row level security;
drop policy if exists "own subscriptions" on group_subscriptions;
create policy "own subscriptions" on group_subscriptions for all using (auth.uid() = user_id);

-- ---- group_posts ----
alter table group_posts enable row level security;
drop policy if exists "subscriber read posts" on group_posts;
drop policy if exists "subscriber write posts" on group_posts;
create policy "subscriber read posts" on group_posts for select
  using (exists (
    select 1 from group_subscriptions gs
    where gs.group_id = group_id
    and gs.user_id = auth.uid()
    and gs.expires_at > now()
  ));
create policy "subscriber write posts" on group_posts for insert
  with check (
    auth.uid() = user_id and
    exists (
      select 1 from group_subscriptions gs
      where gs.group_id = group_id
      and gs.user_id = auth.uid()
      and gs.expires_at > now()
    )
  );

-- ---- notifications ----
alter table notifications enable row level security;
drop policy if exists "own notifications" on notifications;
create policy "own notifications" on notifications for all using (auth.uid() = user_id);

-- ---- reports ----
alter table reports enable row level security;
drop policy if exists "reporter read own" on reports;
drop policy if exists "auth create report" on reports;
create policy "reporter read own" on reports for select using (auth.uid() = reporter_id);
create policy "auth create report" on reports for insert with check (auth.uid() = reporter_id);

-- ---- wallet_transactions ----
alter table wallet_transactions enable row level security;
drop policy if exists "own wallet tx read" on wallet_transactions;
drop policy if exists "system insert wallet tx" on wallet_transactions;
create policy "own wallet tx read" on wallet_transactions for select using (auth.uid() = user_id);
create policy "system insert wallet tx" on wallet_transactions for insert with check (auth.uid() = user_id);

-- ---- follows ----
alter table follows enable row level security;
drop policy if exists "public read follows" on follows;
drop policy if exists "own follows write" on follows;
create policy "public read follows" on follows for select using (true);
create policy "own follows write" on follows for all using (auth.uid() = follower_id);

-- Done!
select 'RLS policies applied successfully' as status;
