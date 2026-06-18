-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── profiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  name        text not null default 'Пользователь',
  avatar      text not null default '🧑',
  context     jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Users see own profile"   on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── saved_items ──────────────────────────────────────────────────────────────
create table public.saved_items (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users on delete cascade not null,
  card_id     int  not null,
  card_data   jsonb not null,
  comment     text,
  created_at  timestamptz not null default now()
);

alter table public.saved_items enable row level security;
create policy "Users manage own saves" on public.saved_items
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── swipe_history ────────────────────────────────────────────────────────────
create table public.swipe_history (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users on delete cascade not null,
  card_id     int  not null,
  card_data   jsonb not null,
  direction   text not null check (direction in ('left','right','up')),
  created_at  timestamptz not null default now()
);

alter table public.swipe_history enable row level security;
create policy "Users manage own history" on public.swipe_history
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── coop_sessions ────────────────────────────────────────────────────────────
create table public.coop_sessions (
  id          uuid primary key default uuid_generate_v4(),
  code        text unique not null,
  host_id     uuid references auth.users on delete cascade not null,
  guest_id    uuid references auth.users on delete set null,
  status      text not null default 'waiting' check (status in ('waiting','active','done')),
  created_at  timestamptz not null default now()
);

alter table public.coop_sessions enable row level security;
create policy "Participants see session" on public.coop_sessions
  for select using (auth.uid() = host_id or auth.uid() = guest_id);
create policy "Host manages session" on public.coop_sessions
  for all using (auth.uid() = host_id);
create policy "Guest joins session" on public.coop_sessions
  for update using (auth.uid() = guest_id or guest_id is null);

-- ─── coop_swipes ─────────────────────────────────────────────────────────────
create table public.coop_swipes (
  id          uuid primary key default uuid_generate_v4(),
  session_id  uuid references public.coop_sessions on delete cascade not null,
  user_id     uuid references auth.users on delete cascade not null,
  card_id     int  not null,
  direction   text not null check (direction in ('left','right','up')),
  created_at  timestamptz not null default now()
);

alter table public.coop_swipes enable row level security;
create policy "Session participants see swipes" on public.coop_swipes
  for select using (
    exists (
      select 1 from public.coop_sessions s
      where s.id = session_id and (s.host_id = auth.uid() or s.guest_id = auth.uid())
    )
  );
create policy "Users insert own swipes" on public.coop_swipes
  for insert with check (auth.uid() = user_id);

-- ─── updated_at trigger ───────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
