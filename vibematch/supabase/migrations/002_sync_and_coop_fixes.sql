-- 002: card_id widening for stable OSM ids (100_000_000_000 + node id).
-- Deploy BEFORE shipping the client that produces bigint card ids.
-- (Sync/coop hardening statements are appended by the auth phase.)

alter table public.saved_items   alter column card_id type bigint;
alter table public.swipe_history alter column card_id type bigint;
alter table public.coop_swipes   alter column card_id type bigint;
