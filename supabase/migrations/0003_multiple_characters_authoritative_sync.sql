alter table public.characters alter column account_type set default 'Unknown';

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
