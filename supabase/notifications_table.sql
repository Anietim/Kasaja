-- Create notifications table if it doesn't exist
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('message','order','delivery','group_reply','price_offer','bid','system','payment')),
  title text not null,
  body text not null,
  read boolean not null default false,
  link text,
  avatar text,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on notifications(user_id);
create index if not exists notifications_created_at_idx on notifications(created_at desc);

-- RLS
alter table notifications enable row level security;
drop policy if exists "own notifications read" on notifications;
drop policy if exists "own notifications write" on notifications;
create policy "own notifications read" on notifications for select using (auth.uid() = user_id);
create policy "own notifications write" on notifications for all using (auth.uid() = user_id);

-- Helper function — called by triggers and Edge Functions to send a notification
create or replace function send_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_link text default null
) returns void language plpgsql security definer as $$
begin
  insert into notifications(user_id, type, title, body, link)
  values (p_user_id, p_type, p_title, p_body, p_link);
end;
$$;

-- Trigger: notify buyer when order status changes
create or replace function notify_order_status() returns trigger language plpgsql security definer as $$
begin
  if NEW.status = 'confirmed' and OLD.status = 'pending' then
    perform send_notification(NEW.buyer_id, 'order', 'Order confirmed ✓',
      'Your order has been confirmed by the seller.', '/orders');
  elsif NEW.status = 'shipped' then
    perform send_notification(NEW.buyer_id, 'delivery', 'Your order is on the way',
      'The seller has dispatched your order.', '/orders');
  elsif NEW.status = 'delivered' then
    perform send_notification(NEW.buyer_id, 'delivery', 'Order delivered',
      'Your order has been marked as delivered. Please confirm receipt.', '/orders');
  elsif NEW.status = 'disputed' then
    perform send_notification(NEW.buyer_id, 'system', 'Dispute opened',
      'A dispute has been raised for your order.', '/orders');
  end if;
  return NEW;
end;
$$;

drop trigger if exists on_order_status_change on orders;
create trigger on_order_status_change
  after update of status on orders
  for each row execute function notify_order_status();

-- Trigger: notify when a new message arrives
create or replace function notify_new_message() returns trigger language plpgsql security definer as $$
declare
  v_other_id uuid;
begin
  select case when participant_a = NEW.sender_id then participant_b else participant_a end
  into v_other_id
  from conversations where id = NEW.conversation_id;
  perform send_notification(v_other_id, 'message', 'New message',
    left(NEW.content, 80), '/inbox');
  return NEW;
end;
$$;

drop trigger if exists on_new_message on messages;
create trigger on_new_message
  after insert on messages
  for each row execute function notify_new_message();

-- Trigger: notify poster when someone replies to their group post
create or replace function notify_group_reply() returns trigger language plpgsql security definer as $$
declare
  v_poster_id uuid;
  v_group_name text;
begin
  select p.author_id into v_poster_id from group_posts p where p.id = NEW.post_id;
  select mg.name into v_group_name from market_groups mg
    join group_posts gp on gp.group_id = mg.id
    where gp.id = NEW.post_id;
  if v_poster_id is not null and v_poster_id != NEW.author_id then
    perform send_notification(v_poster_id, 'group_reply', 'Price reply received',
      'A seller replied to your post in ' || coalesce(v_group_name, 'a market group'), '/groups');
  end if;
  return NEW;
end;
$$;

drop trigger if exists on_group_reply on group_posts;
create trigger on_group_reply
  after insert on group_posts
  for each row when (NEW.parent_id is not null)
  execute function notify_group_reply();

select 'notifications setup done' as status;
