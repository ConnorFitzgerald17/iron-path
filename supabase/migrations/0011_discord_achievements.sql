create type public.achievement_type as enum ('collection_unlock', 'goal_complete');
create type public.discord_delivery_status as enum ('pending', 'processing', 'sent', 'failed');

create table public.discord_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  discord_user_id text not null unique check (discord_user_id ~ '^[0-9]{15,22}$'),
  discord_username text,
  linked_at timestamptz not null default now()
);

create table public.discord_link_codes (
  id uuid primary key default gen_random_uuid(),
  discord_user_id text not null check (discord_user_id ~ '^[0-9]{15,22}$'),
  discord_username text,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.discord_guilds (
  guild_id text primary key check (guild_id ~ '^[0-9]{15,22}$'),
  achievement_channel_id text not null check (achievement_channel_id ~ '^[0-9]{15,22}$'),
  enabled boolean not null default true,
  settings jsonb not null default '{"collection_unlock":true,"goal_complete":true}'::jsonb,
  configured_by_discord_user_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.discord_guild_memberships (
  guild_id text not null references public.discord_guilds(guild_id) on delete cascade,
  discord_user_id text not null,
  character_id uuid not null references public.characters(id) on delete cascade,
  announcements_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (guild_id, discord_user_id),
  unique (guild_id, character_id)
);

create table public.achievement_events (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  character_id uuid not null references public.characters(id) on delete cascade,
  type achievement_type not null,
  occurred_at timestamptz not null,
  payload jsonb not null,
  dedupe_key text not null unique,
  created_at timestamptz not null default now()
);

create table public.discord_deliveries (
  id bigint generated always as identity primary key,
  event_id bigint not null references public.achievement_events(id) on delete cascade,
  guild_id text not null references public.discord_guilds(guild_id) on delete cascade,
  channel_id text not null,
  status discord_delivery_status not null default 'pending',
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, guild_id)
);

create index achievement_events_character_recent_idx on public.achievement_events(character_id, occurred_at desc);
create index discord_deliveries_pending_idx on public.discord_deliveries(status, next_attempt_at);

alter table public.discord_accounts enable row level security;
alter table public.discord_link_codes enable row level security;
alter table public.discord_guilds enable row level security;
alter table public.discord_guild_memberships enable row level security;
alter table public.achievement_events enable row level security;
alter table public.discord_deliveries enable row level security;

create policy "owners read discord account" on public.discord_accounts for select using (auth.uid() = user_id);
create policy "owners read achievements" on public.achievement_events for select using (
  exists (select 1 from public.characters c where c.id = character_id and c.user_id = auth.uid())
);

grant all on public.discord_accounts, public.discord_link_codes, public.discord_guilds,
  public.discord_guild_memberships, public.achievement_events, public.discord_deliveries to service_role;
grant usage, select on sequence public.achievement_events_id_seq, public.discord_deliveries_id_seq to service_role;
grant select on public.discord_accounts, public.achievement_events to authenticated;

create or replace function public.consume_discord_link_code(p_user_id uuid, p_token_hash text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  pending public.discord_link_codes;
begin
  select * into pending from public.discord_link_codes
  where token_hash = p_token_hash and used_at is null and expires_at > now()
  for update;
  if pending.id is null then return false; end if;

  insert into public.discord_accounts (user_id, discord_user_id, discord_username, linked_at)
  values (p_user_id, pending.discord_user_id, pending.discord_username, now())
  on conflict (user_id) do update set
    discord_user_id = excluded.discord_user_id,
    discord_username = excluded.discord_username,
    linked_at = excluded.linked_at;
  update public.discord_link_codes set used_at = now() where id = pending.id;
  return true;
exception when unique_violation then
  return false;
end;
$$;

revoke execute on function public.consume_discord_link_code(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_discord_link_code(uuid, text) to service_role;

create or replace function public.queue_achievement_deliveries()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.discord_deliveries (event_id, guild_id, channel_id)
  select new.id, membership.guild_id, guild.achievement_channel_id
  from public.discord_guild_memberships membership
  join public.discord_guilds guild on guild.guild_id = membership.guild_id
  where membership.character_id = new.character_id
    and membership.announcements_enabled
    and guild.enabled
    and coalesce((guild.settings->>new.type::text)::boolean, true)
  on conflict (event_id, guild_id) do nothing;
  return new;
end;
$$;

create trigger achievement_events_queue_discord
after insert on public.achievement_events
for each row execute function public.queue_achievement_deliveries();

create or replace function public.record_goal_completion()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status <> 'complete' and new.status = 'complete' then
    insert into public.achievement_events (character_id, type, occurred_at, payload, dedupe_key)
    values (
      new.character_id,
      'goal_complete',
      now(),
      jsonb_build_object('goalId', new.id, 'title', new.title, 'kind', new.kind::text),
      'goal:' || new.id::text || ':complete'
    ) on conflict (dedupe_key) do nothing;
  end if;
  return new;
end;
$$;

create trigger goals_record_completion
after update of status on public.goals
for each row execute function public.record_goal_completion();

create or replace function public.record_collection_unlock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.source = 'unlock' and new.first_seen_at is not null
     and (tg_op = 'INSERT' or old.source <> 'unlock' or old.first_seen_at is null) then
    insert into public.achievement_events (character_id, type, occurred_at, payload, dedupe_key)
    values (
      new.character_id,
      'collection_unlock',
      new.first_seen_at,
      jsonb_build_object('itemId', new.item_id, 'sectionKey', new.section_key),
      'collection:' || new.character_id::text || ':' || new.item_id::text
    ) on conflict (dedupe_key) do nothing;
  end if;
  return new;
end;
$$;

create trigger collection_recent_record_unlock
after insert or update of source, first_seen_at on public.collection_log_recent_items
for each row execute function public.record_collection_unlock();

create or replace function public.claim_discord_deliveries(p_limit integer default 25)
returns setof public.discord_deliveries language plpgsql security definer set search_path = public as $$
begin
  return query
  update public.discord_deliveries delivery set
    status = 'processing',
    attempts = delivery.attempts + 1,
    updated_at = now()
  where delivery.id in (
    select candidate.id from public.discord_deliveries candidate
    where (candidate.status in ('pending', 'failed') or (candidate.status = 'processing' and candidate.updated_at < now() - interval '5 minutes'))
      and candidate.next_attempt_at <= now() and candidate.attempts < 6
    order by candidate.next_attempt_at, candidate.id
    for update skip locked
    limit greatest(1, least(p_limit, 100))
  )
  returning delivery.*;
end;
$$;

revoke execute on function public.claim_discord_deliveries(integer) from public, anon, authenticated;
grant execute on function public.claim_discord_deliveries(integer) to service_role;
