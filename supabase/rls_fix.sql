-- ============================================================
-- KASAJA RLS + SEED FIX
-- Run this ONE file in Supabase SQL Editor
-- It is safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT)
-- ============================================================

-- 1. Enable RLS on all tables (safe if already enabled)
do $$ 
declare t text;
begin
  for t in select tablename from pg_tables where schemaname='public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- 2. Public read policies for reference / browse tables
do $$
begin
  -- ng_states
  if not exists (select 1 from pg_policies where tablename='ng_states' and policyname='public_read_states') then
    execute 'create policy public_read_states on ng_states for select using (true)';
  end if;
  -- ng_markets
  if not exists (select 1 from pg_policies where tablename='ng_markets' and policyname='public_read_markets') then
    execute 'create policy public_read_markets on ng_markets for select using (true)';
  end if;
  -- stores
  if not exists (select 1 from pg_policies where tablename='stores' and policyname='public_read_stores') then
    execute 'create policy public_read_stores on stores for select using (true)';
  end if;
  -- products
  if not exists (select 1 from pg_policies where tablename='products' and policyname='public_read_products') then
    execute 'create policy public_read_products on products for select using (true)';
  end if;
  -- profiles
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='public_read_profiles') then
    execute 'create policy public_read_profiles on profiles for select using (true)';
  end if;
  -- market_groups
  if not exists (select 1 from pg_policies where tablename='market_groups' and policyname='public_read_groups') then
    execute 'create policy public_read_groups on market_groups for select using (true)';
  end if;
  -- group_posts
  if not exists (select 1 from pg_policies where tablename='group_posts' and policyname='public_read_group_posts') then
    execute 'create policy public_read_group_posts on group_posts for select using (true)';
  end if;
  -- product_images
  if not exists (select 1 from pg_policies where tablename='product_images' and policyname='public_read_product_images') then
    execute 'create policy public_read_product_images on product_images for select using (true)';
  end if;
  -- product_likes
  if not exists (select 1 from pg_policies where tablename='product_likes' and policyname='public_read_likes') then
    execute 'create policy public_read_likes on product_likes for select using (true)';
  end if;
  -- orders: only involved parties
  if not exists (select 1 from pg_policies where tablename='orders' and policyname='orders_select') then
    execute 'create policy orders_select on orders for select using (auth.uid() = buyer_id or auth.uid() in (select owner_id from stores where id = store_id))';
  end if;
  -- conversations
  if not exists (select 1 from pg_policies where tablename='conversations' and policyname='convos_select') then
    execute 'create policy convos_select on conversations for select using (auth.uid() = participant_a or auth.uid() = participant_b)';
  end if;
  -- messages
  if not exists (select 1 from pg_policies where tablename='messages' and policyname='messages_select') then
    execute 'create policy messages_select on messages for select using (exists (select 1 from conversations where id = conversation_id and (auth.uid() = participant_a or auth.uid() = participant_b)))';
  end if;
  -- wallet_transactions: owner only
  if not exists (select 1 from pg_policies where tablename='wallet_transactions' and policyname='wallet_tx_select') then
    execute 'create policy wallet_tx_select on wallet_transactions for select using (auth.uid() = user_id)';
  end if;
  -- delivery_jobs
  if not exists (select 1 from pg_policies where tablename='delivery_jobs' and policyname='delivery_jobs_select') then
    execute 'create policy delivery_jobs_select on delivery_jobs for select using (true)';
  end if;
  -- delivery_bids
  if not exists (select 1 from pg_policies where tablename='delivery_bids' and policyname='delivery_bids_select') then
    execute 'create policy delivery_bids_select on delivery_bids for select using (true)';
  end if;
end $$;

-- 3. Insert policies (authenticated users)
do $$
begin
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='profiles_insert') then
    execute 'create policy profiles_insert on profiles for insert with check (auth.uid() = id)';
  end if;
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='profiles_update') then
    execute 'create policy profiles_update on profiles for update using (auth.uid() = id)';
  end if;
  if not exists (select 1 from pg_policies where tablename='stores' and policyname='stores_insert') then
    execute 'create policy stores_insert on stores for insert with check (auth.uid() = owner_id)';
  end if;
  if not exists (select 1 from pg_policies where tablename='stores' and policyname='stores_update') then
    execute 'create policy stores_update on stores for update using (auth.uid() = owner_id)';
  end if;
  if not exists (select 1 from pg_policies where tablename='products' and policyname='products_insert') then
    execute 'create policy products_insert on products for insert with check (auth.uid() in (select owner_id from stores where id = store_id))';
  end if;
  if not exists (select 1 from pg_policies where tablename='products' and policyname='products_update') then
    execute 'create policy products_update on products for update using (auth.uid() in (select owner_id from stores where id = store_id))';
  end if;
  if not exists (select 1 from pg_policies where tablename='orders' and policyname='orders_insert') then
    execute 'create policy orders_insert on orders for insert with check (auth.uid() = buyer_id)';
  end if;
  if not exists (select 1 from pg_policies where tablename='messages' and policyname='messages_insert') then
    execute 'create policy messages_insert on messages for insert with check (auth.uid() = sender_id)';
  end if;
  if not exists (select 1 from pg_policies where tablename='conversations' and policyname='convos_insert') then
    execute 'create policy convos_insert on conversations for insert with check (auth.uid() = participant_a or auth.uid() = participant_b)';
  end if;
  if not exists (select 1 from pg_policies where tablename='follows' and policyname='follows_insert') then
    execute 'create policy follows_insert on follows for insert with check (auth.uid() = follower_id)';
  end if;
  if not exists (select 1 from pg_policies where tablename='follows' and policyname='follows_delete') then
    execute 'create policy follows_delete on follows for delete using (auth.uid() = follower_id)';
  end if;
  if not exists (select 1 from pg_policies where tablename='product_likes' and policyname='likes_insert') then
    execute 'create policy likes_insert on product_likes for insert with check (auth.uid() = user_id)';
  end if;
  if not exists (select 1 from pg_policies where tablename='product_likes' and policyname='likes_delete') then
    execute 'create policy likes_delete on product_likes for delete using (auth.uid() = user_id)';
  end if;
  if not exists (select 1 from pg_policies where tablename='delivery_jobs' and policyname='delivery_jobs_insert') then
    execute 'create policy delivery_jobs_insert on delivery_jobs for insert with check (auth.uid() = requester_id)';
  end if;
  if not exists (select 1 from pg_policies where tablename='delivery_bids' and policyname='delivery_bids_insert') then
    execute 'create policy delivery_bids_insert on delivery_bids for insert with check (auth.uid() = rider_id)';
  end if;
  if not exists (select 1 from pg_policies where tablename='group_posts' and policyname='group_posts_insert') then
    execute 'create policy group_posts_insert on group_posts for insert with check (auth.uid() = author_id)';
  end if;
  if not exists (select 1 from pg_policies where tablename='wallet_transactions' and policyname='wallet_tx_insert') then
    execute 'create policy wallet_tx_insert on wallet_transactions for insert with check (auth.uid() = user_id)';
  end if;
end $$;

-- 4. Seed Nigeria states (safe — on conflict do nothing)
insert into ng_states (name, code, region) values
('Abia','AB','South East'),('Adamawa','AD','North East'),('Akwa Ibom','AK','South South'),
('Anambra','AN','South East'),('Bauchi','BA','North East'),('Bayelsa','BY','South South'),
('Benue','BE','North Central'),('Borno','BO','North East'),('Cross River','CR','South South'),
('Delta','DE','South South'),('Ebonyi','EB','South East'),('Edo','ED','South South'),
('Ekiti','EK','South West'),('Enugu','EN','South East'),('FCT Abuja','FC','North Central'),
('Gombe','GO','North East'),('Imo','IM','South East'),('Jigawa','JI','North West'),
('Kaduna','KD','North West'),('Kano','KN','North West'),('Katsina','KT','North West'),
('Kebbi','KB','North West'),('Kogi','KO','North Central'),('Kwara','KW','North Central'),
('Lagos','LA','South West'),('Nasarawa','NA','North Central'),('Niger','NI','North Central'),
('Ogun','OG','South West'),('Ondo','ON','South West'),('Osun','OS','South West'),
('Oyo','OY','South West'),('Plateau','PL','North Central'),('Rivers','RI','South South'),
('Sokoto','SO','North West'),('Taraba','TA','North East'),('Yobe','YO','North East'),
('Zamfara','ZA','North West')
on conflict (code) do nothing;

-- 5. Seed Lagos markets
insert into ng_markets (state_id, name, slug, description, speciality, address) values
((select id from ng_states where code='LA'),'Balogun Market','balogun-lagos','One of the largest markets in West Africa',ARRAY['textiles','clothing','fabrics'],'Lagos Island, Lagos'),
((select id from ng_states where code='LA'),'Computer Village','computer-village-lagos','Nigeria''s largest electronics hub',ARRAY['electronics','phones','computers'],'Ikeja, Lagos'),
((select id from ng_states where code='LA'),'Alaba International','alaba-international','Electronics and gadgets wholesale',ARRAY['electronics','appliances','generators'],'Ojo, Lagos'),
((select id from ng_states where code='LA'),'Mile 12 Market','mile-12-lagos','Largest food market in Lagos',ARRAY['foodstuff','vegetables','grains'],'Kosofe, Lagos'),
((select id from ng_states where code='LA'),'Ladipo Market','ladipo-lagos','Auto parts and spare parts hub',ARRAY['auto parts','spare parts','tools'],'Mushin, Lagos'),
((select id from ng_states where code='LA'),'Idumota Market','idumota-lagos','Wholesale cosmetics and provisions',ARRAY['cosmetics','provisions','clothing'],'Lagos Island, Lagos'),
((select id from ng_states where code='LA'),'Tejuosho Market','tejuosho-lagos','Fashion and fabric market',ARRAY['fashion','fabrics','shoes'],'Yaba, Lagos'),
((select id from ng_states where code='LA'),'Trade Fair Complex','trade-fair-lagos','International trade and wholesale',ARRAY['wholesale','electronics','furniture'],'Ojo, Lagos')
on conflict (slug) do nothing;

-- 6. Seed Abuja markets
insert into ng_markets (state_id, name, slug, description, speciality, address) values
((select id from ng_states where code='FC'),'Wuse Market','wuse-abuja','Main retail market in Abuja',ARRAY['clothing','food','provisions'],'Wuse, Abuja'),
((select id from ng_states where code='FC'),'Garki Market','garki-abuja','Abuja central market',ARRAY['food','clothing','electronics'],'Garki, Abuja'),
((select id from ng_states where code='FC'),'UTC Abuja','utc-abuja','Electronics and general goods',ARRAY['electronics','appliances','clothing'],'Central Business District, Abuja'),
((select id from ng_states where code='FC'),'Nyanya Market','nyanya-abuja','Satellite town market',ARRAY['food','clothing','provisions'],'Nyanya, Abuja')
on conflict (slug) do nothing;

-- 7. Seed Kano markets
insert into ng_markets (state_id, name, slug, description, speciality, address) values
((select id from ng_states where code='KN'),'Kurmi Market','kurmi-kano','Historic Kano central market',ARRAY['leather','crafts','clothing'],'Kano City'),
((select id from ng_states where code='KN'),'Kantin Kwari','kantin-kwari-kano','Largest fabric market in West Africa',ARRAY['fabrics','textiles','tailoring'],'Kano'),
((select id from ng_states where code='KN'),'Singer Market','singer-kano','Electronics and phones',ARRAY['electronics','phones','accessories'],'Kano')
on conflict (slug) do nothing;

-- 8. Seed Port Harcourt markets
insert into ng_markets (state_id, name, slug, description, speciality, address) values
((select id from ng_states where code='RI'),'Mile 1 Market','mile-1-ph','Main market in Port Harcourt',ARRAY['clothing','food','electronics'],'Port Harcourt'),
((select id from ng_states where code='RI'),'Oil Mill Market','oil-mill-ph','Wholesale food and provisions',ARRAY['food','provisions','foodstuff'],'Port Harcourt'),
((select id from ng_states where code='RI'),'Rumuola Market','rumuola-ph','Electronics and general goods',ARRAY['electronics','clothing','shoes'],'Rumuola, Port Harcourt')
on conflict (slug) do nothing;

-- 9. Seed market groups for Lagos markets
insert into market_groups (market_id, name, description, tier, daily_fee_kobo, weekly_fee_kobo, monthly_fee_kobo)
select 
  m.id,
  m.name || ' Traders Group',
  'Official traders group for ' || m.name,
  'monthly',
  10000,
  50000,
  150000
from ng_markets m
where m.slug in ('balogun-lagos','computer-village-lagos','alaba-international','mile-12-lagos','ladipo-lagos')
on conflict do nothing;

select 'Setup complete! Tables: ' || count(*)::text || ' states seeded' from ng_states;
