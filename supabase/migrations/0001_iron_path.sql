create extension if not exists pgcrypto;

create type public.profile_visibility as enum ('private', 'public');
create type public.goal_kind as enum ('quest', 'grind', 'banked_xp');
create type public.quest_state as enum ('not_started', 'in_progress', 'finished');

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 12),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  account_type text not null default 'Ironman',
  combat_level integer not null default 3,
  total_level integer not null default 32,
  visibility profile_visibility not null default 'private',
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plugin_devices (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  token_hash text not null unique,
  label text not null,
  client_version text,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.plugin_link_codes (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  code_hash text not null unique,
  device_id uuid references public.plugin_devices(id) on delete set null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.character_skills (
  character_id uuid not null references public.characters(id) on delete cascade,
  skill text not null,
  level integer not null,
  xp bigint not null,
  captured_at timestamptz not null,
  primary key (character_id, skill)
);

create table public.character_quests (
  character_id uuid not null references public.characters(id) on delete cascade,
  quest_key text not null,
  state quest_state not null,
  captured_at timestamptz not null,
  primary key (character_id, quest_key)
);

create table public.character_items (
  character_id uuid not null references public.characters(id) on delete cascade,
  item_id integer not null,
  container text not null check (container in ('bank', 'inventory', 'equipment')),
  quantity bigint not null check (quantity >= 0),
  captured_at timestamptz not null,
  primary key (character_id, item_id, container)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  kind goal_kind not null,
  title text not null,
  status text not null default 'active' check (status in ('active', 'complete')),
  is_public boolean not null default false,
  archived boolean not null default false,
  sort_order integer not null default 0,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.loot_events (
  id bigint generated always as identity primary key,
  event_id uuid not null,
  character_id uuid not null references public.characters(id) on delete cascade,
  device_id uuid not null references public.plugin_devices(id) on delete cascade,
  occurred_at timestamptz not null,
  npc_id integer not null,
  npc_name text not null,
  items jsonb not null,
  received_at timestamptz not null default now(),
  unique (device_id, event_id)
);

create table public.catalog_items (
  item_id integer primary key,
  name text not null,
  icon_file text,
  examine text,
  members boolean not null default false,
  updated_at timestamptz not null
);

create table public.catalog_quests (
  wiki_key text primary key,
  name text not null,
  description text,
  difficulty text,
  length text,
  requirements_raw text,
  items_raw text,
  skill_requirements jsonb not null default '[]'::jsonb,
  prerequisite_quests jsonb not null default '[]'::jsonb,
  parsed_items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null
);

create table public.catalog_monsters (
  wiki_key text primary key,
  name text not null,
  npc_ids integer[] not null default '{}',
  image_file text,
  combat_level integer,
  version_anchor text,
  updated_at timestamptz not null
);

create table public.catalog_drops (
  source_key text not null,
  item_name text not null,
  rarity text not null,
  rarity_denominator double precision,
  quantity_low double precision,
  quantity_high double precision,
  raw jsonb not null,
  updated_at timestamptz not null,
  primary key (source_key, item_name, rarity)
);

create table public.catalog_sync_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null,
  completed_at timestamptz,
  status text not null,
  counts jsonb,
  error text
);

create or replace function public.ingest_plugin_snapshot(p_character_id uuid, p_device_id uuid, p_snapshot jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  captured timestamptz := (p_snapshot->>'capturedAt')::timestamptz;
begin
  if not exists (select 1 from plugin_devices where id = p_device_id and character_id = p_character_id and revoked_at is null) then
    raise exception 'invalid device';
  end if;
  if exists (select 1 from characters where id = p_character_id and last_synced_at > captured) then
    return;
  end if;

  insert into character_skills (character_id, skill, level, xp, captured_at)
  select p_character_id, value->>'skill', (value->>'level')::integer, (value->>'xp')::bigint, captured
  from jsonb_array_elements(p_snapshot->'skills')
  on conflict (character_id, skill) do update set level = excluded.level, xp = excluded.xp, captured_at = excluded.captured_at
  where character_skills.captured_at <= excluded.captured_at;

  insert into character_quests (character_id, quest_key, state, captured_at)
  select p_character_id, value->>'quest', (value->>'state')::quest_state, captured
  from jsonb_array_elements(p_snapshot->'quests')
  on conflict (character_id, quest_key) do update set state = excluded.state, captured_at = excluded.captured_at
  where character_quests.captured_at <= excluded.captured_at;

  delete from character_items where character_id = p_character_id and captured_at <= captured;
  insert into character_items (character_id, item_id, container, quantity, captured_at)
  select p_character_id, (value->>'itemId')::integer, value->>'container', sum((value->>'quantity')::bigint), captured
  from jsonb_array_elements(p_snapshot->'items') group by value->>'itemId', value->>'container';

  update characters set name = p_snapshot->>'characterName', last_synced_at = captured, updated_at = now() where id = p_character_id;
end;
$$;

alter table public.characters enable row level security;
alter table public.plugin_devices enable row level security;
alter table public.plugin_link_codes enable row level security;
alter table public.character_skills enable row level security;
alter table public.character_quests enable row level security;
alter table public.character_items enable row level security;
alter table public.goals enable row level security;
alter table public.loot_events enable row level security;

create policy "owners manage characters" on public.characters for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "public characters readable" on public.characters for select using (visibility = 'public');

create policy "owners manage devices" on public.plugin_devices for all using (exists (select 1 from characters c where c.id = character_id and c.user_id = auth.uid())) with check (exists (select 1 from characters c where c.id = character_id and c.user_id = auth.uid()));
create policy "owners manage link codes" on public.plugin_link_codes for all using (exists (select 1 from characters c where c.id = character_id and c.user_id = auth.uid())) with check (exists (select 1 from characters c where c.id = character_id and c.user_id = auth.uid()));

create policy "owners read skills" on public.character_skills for select using (exists (select 1 from characters c where c.id = character_id and c.user_id = auth.uid()));
create policy "public skills readable" on public.character_skills for select using (exists (select 1 from characters c where c.id = character_id and c.visibility = 'public'));
create policy "owners read quests" on public.character_quests for select using (exists (select 1 from characters c where c.id = character_id and c.user_id = auth.uid()));
create policy "owners read items" on public.character_items for select using (exists (select 1 from characters c where c.id = character_id and c.user_id = auth.uid()));
create policy "owners manage goals" on public.goals for all using (exists (select 1 from characters c where c.id = character_id and c.user_id = auth.uid())) with check (exists (select 1 from characters c where c.id = character_id and c.user_id = auth.uid()));
create policy "public goals readable" on public.goals for select using (is_public and exists (select 1 from characters c where c.id = character_id and c.visibility = 'public'));
create policy "owners read loot" on public.loot_events for select using (exists (select 1 from characters c where c.id = character_id and c.user_id = auth.uid()));

grant execute on function public.ingest_plugin_snapshot(uuid, uuid, jsonb) to service_role;
create index goals_character_active_idx on public.goals(character_id, archived, sort_order);
create index loot_events_character_npc_idx on public.loot_events(character_id, npc_id, occurred_at desc);
create index catalog_items_name_idx on public.catalog_items using gin (to_tsvector('simple', name));
create index catalog_monsters_npc_ids_idx on public.catalog_monsters using gin (npc_ids);
