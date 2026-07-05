-- 002: card_id widening for stable OSM ids (100_000_000_000 + node id).
-- Deploy BEFORE shipping the client that produces bigint card ids.

alter table public.saved_items   alter column card_id type bigint;
alter table public.swipe_history alter column card_id type bigint;
alter table public.coop_swipes   alter column card_id type bigint;

-- ─── Merge-sync keys ─────────────────────────────────────────────────────────
-- Client-generated stable record id lets history sync append-only
-- (upsert with ignoreDuplicates) instead of destructive delete+insert.
alter table public.swipe_history add column if not exists record_id uuid;
update public.swipe_history set record_id = uuid_generate_v4() where record_id is null;
alter table public.swipe_history alter column record_id set not null;
alter table public.swipe_history alter column record_id set default uuid_generate_v4();

create unique index if not exists swipe_history_user_record_uidx
  on public.swipe_history (user_id, record_id);
create unique index if not exists saved_items_user_card_uidx
  on public.saved_items (user_id, card_id);

-- ─── Coop RLS fix ────────────────────────────────────────────────────────────
-- The old guest policy let ANY authenticated user hijack any waiting room
-- (guest_id is null matched everyone). Joining now goes through an atomic
-- security-definer function; the plain update path for guests is removed.
drop policy if exists "Guest joins session" on public.coop_sessions;
drop policy if exists "Host manages session" on public.coop_sessions;
create policy "Host manages session" on public.coop_sessions
  for all using (auth.uid() = host_id) with check (auth.uid() = host_id);

create or replace function public.join_coop_session(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update public.coop_sessions
     set guest_id = auth.uid(),
         status   = 'active'
   where code = upper(p_code)
     and status = 'waiting'
     and guest_id is null
     and host_id <> auth.uid()
  returning id into v_id;

  return v_id; -- null when no joinable room matched
end;
$$;

revoke all on function public.join_coop_session(text) from public;
grant execute on function public.join_coop_session(text) to authenticated;

-- ─── AI tip rate limiting (service-role only, no client policies) ────────────
create table if not exists public.ai_tip_usage (
  user_id  uuid references auth.users on delete cascade not null,
  day      date not null default current_date,
  calls    int  not null default 0,
  primary key (user_id, day)
);
alter table public.ai_tip_usage enable row level security;
-- no policies: only the service-role key (edge functions) can touch it
