create table public.character_kill_counts (
  character_id uuid not null references public.characters(id) on delete cascade,
  source_key text not null,
  source_name text not null,
  count integer not null check (count >= 0),
  captured_at timestamptz not null,
  primary key (character_id, source_key)
);

create table public.collection_log_recent_items (
  character_id uuid not null references public.characters(id) on delete cascade,
  item_id integer not null,
  section_key text,
  first_seen_at timestamptz,
  source text not null check (source in ('overview', 'unlock')),
  overview_order integer,
  primary key (character_id, item_id)
);

alter table public.character_kill_counts enable row level security;
alter table public.collection_log_recent_items enable row level security;

create policy "owners read kill counts" on public.character_kill_counts for select using (
  exists (select 1 from public.characters c where c.id = character_id and c.user_id = auth.uid())
);
create policy "owners read recent collection items" on public.collection_log_recent_items for select using (
  exists (select 1 from public.characters c where c.id = character_id and c.user_id = auth.uid())
);

create or replace function public.ingest_plugin_snapshot(p_character_id uuid, p_device_id uuid, p_snapshot jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  captured timestamptz := (p_snapshot->>'capturedAt')::timestamptz;
  total integer;
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

  select coalesce(sum((value->>'level')::integer), 32) into total
  from jsonb_array_elements(p_snapshot->'skills');

  insert into character_quests (character_id, quest_key, state, captured_at)
  select p_character_id, value->>'quest', (value->>'state')::quest_state, captured
  from jsonb_array_elements(p_snapshot->'quests')
  on conflict (character_id, quest_key) do update set state = excluded.state, captured_at = excluded.captured_at
  where character_quests.captured_at <= excluded.captured_at;

  delete from character_items where character_id = p_character_id and captured_at <= captured;
  insert into character_items (character_id, item_id, container, quantity, captured_at)
  select p_character_id, (value->>'itemId')::integer, value->>'container', sum((value->>'quantity')::bigint), captured
  from jsonb_array_elements(p_snapshot->'items') group by value->>'itemId', value->>'container';

  insert into character_kill_counts (character_id, source_key, source_name, count, captured_at)
  select p_character_id,
    lower(regexp_replace(trim(value->>'sourceName'), '[_-]+', ' ', 'g')),
    value->>'sourceName', (value->>'count')::integer,
    coalesce((value->>'capturedAt')::timestamptz, captured)
  from jsonb_array_elements(coalesce(p_snapshot->'killCounts', '[]'::jsonb))
  on conflict (character_id, source_key) do update set
    source_name = case when excluded.count >= character_kill_counts.count then excluded.source_name else character_kill_counts.source_name end,
    count = greatest(character_kill_counts.count, excluded.count),
    captured_at = greatest(character_kill_counts.captured_at, excluded.captured_at);

  update characters set
    name = p_snapshot->>'characterName',
    account_type = coalesce(nullif(p_snapshot->>'accountType', ''), account_type),
    combat_level = coalesce((p_snapshot->>'combatLevel')::integer, combat_level),
    total_level = greatest(32, total),
    last_synced_at = captured,
    updated_at = now()
  where id = p_character_id;
end;
$$;

create or replace function public.ingest_collection_log_sync(p_character_id uuid, p_device_id uuid, p_sync jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  captured timestamptz := (p_sync->>'capturedAt')::timestamptz;
  section jsonb;
  section_captured timestamptz;
  key text;
  has_baseline boolean;
begin
  if not exists (select 1 from plugin_devices where id = p_device_id and character_id = p_character_id and revoked_at is null) then
    raise exception 'invalid device';
  end if;
  select exists(select 1 from collection_log_sections where character_id = p_character_id) into has_baseline;

  for section in select value from jsonb_array_elements(p_sync->'sections') loop
    key := section->>'key';
    section_captured := (section->>'capturedAt')::timestamptz;
    if exists (select 1 from collection_log_sections where character_id = p_character_id and section_key = key and captured_at > section_captured) then
      continue;
    end if;

    if has_baseline then
      insert into collection_log_recent_items (character_id, item_id, section_key, first_seen_at, source, overview_order)
      select p_character_id, (slot->>'itemId')::integer, key, captured, 'unlock', null
      from jsonb_array_elements(section->'slots') slot
      where (slot->>'obtained')::boolean and not exists (
        select 1 from collection_log_slots old
        where old.character_id = p_character_id and old.section_key = key
          and old.item_id = (slot->>'itemId')::integer and old.obtained
      )
      on conflict (character_id, item_id) do update set
        section_key = excluded.section_key,
        first_seen_at = coalesce(collection_log_recent_items.first_seen_at, excluded.first_seen_at),
        source = 'unlock';
    end if;

    insert into collection_log_sections (character_id, section_key, category, name, obtained_count, total_count, captured_at, metadata)
    values (p_character_id, key, section->>'category', section->>'name',
      (section->>'obtainedCount')::integer, (section->>'totalCount')::integer, section_captured,
      coalesce(section->'metadata', '{}'::jsonb))
    on conflict (character_id, section_key) do update set
      category = excluded.category, name = excluded.name, obtained_count = excluded.obtained_count,
      total_count = excluded.total_count, captured_at = excluded.captured_at,
      metadata = case when excluded.metadata = '{}'::jsonb then collection_log_sections.metadata else excluded.metadata end;

    delete from collection_log_slots where character_id = p_character_id and section_key = key;
    insert into collection_log_slots (character_id, section_key, item_id, quantity, obtained, slot_order)
    select p_character_id, key, (slot->>'itemId')::integer, (slot->>'quantity')::integer,
      (slot->>'obtained')::boolean, (slot->>'slotOrder')::integer
    from jsonb_array_elements(section->'slots') slot;
  end loop;

  insert into collection_log_recent_items (character_id, item_id, section_key, first_seen_at, source, overview_order)
  select p_character_id, recent.item_id, slots.section_key, null, 'overview', recent.ordinality::integer
  from (
    select value::integer item_id, ordinality
    from jsonb_array_elements_text(coalesce(p_sync->'recentItemIds', '[]'::jsonb)) with ordinality
  ) recent
  left join lateral (
    select section_key from collection_log_slots
    where character_id = p_character_id and item_id = recent.item_id
    order by obtained desc limit 1
  ) slots on true
  on conflict (character_id, item_id) do update set
    section_key = coalesce(collection_log_recent_items.section_key, excluded.section_key),
    overview_order = excluded.overview_order;
end;
$$;
