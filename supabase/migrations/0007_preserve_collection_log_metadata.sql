create or replace function public.ingest_collection_log_section(p_character_id uuid, p_device_id uuid, p_section jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  captured timestamptz := (p_section->>'capturedAt')::timestamptz;
  key text := p_section->>'key';
begin
  if not exists (select 1 from plugin_devices where id = p_device_id and character_id = p_character_id and revoked_at is null) then
    raise exception 'invalid device';
  end if;
  if exists (select 1 from collection_log_sections where character_id = p_character_id and section_key = key and captured_at > captured) then
    return;
  end if;

  insert into collection_log_sections (character_id, section_key, category, name, obtained_count, total_count, captured_at, metadata)
  values (p_character_id, key, p_section->>'category', p_section->>'name',
    (p_section->>'obtainedCount')::integer, (p_section->>'totalCount')::integer, captured,
    coalesce(p_section->'metadata', '{}'::jsonb))
  on conflict (character_id, section_key) do update set
    category = excluded.category, name = excluded.name, obtained_count = excluded.obtained_count,
    total_count = excluded.total_count, captured_at = excluded.captured_at,
    metadata = case when excluded.metadata = '{}'::jsonb then collection_log_sections.metadata else excluded.metadata end;

  delete from collection_log_slots where character_id = p_character_id and section_key = key;
  insert into collection_log_slots (character_id, section_key, item_id, quantity, obtained, slot_order)
  select p_character_id, key, (value->>'itemId')::integer, (value->>'quantity')::integer,
    (value->>'obtained')::boolean, (value->>'slotOrder')::integer
  from jsonb_array_elements(p_section->'slots');
end;
$$;
