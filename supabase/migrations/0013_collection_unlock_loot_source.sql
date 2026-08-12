create or replace function public.record_collection_unlock()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  previous_section_sync timestamptz;
  matched_loot public.loot_events%rowtype;
  achievement_payload jsonb;
begin
  if new.source = 'unlock' and new.first_seen_at is not null
     and (tg_op = 'INSERT' or old.source <> 'unlock' or old.first_seen_at is null) then
    select captured_at into previous_section_sync
    from public.collection_log_sections
    where character_id = new.character_id and section_key = new.section_key;

    select loot.* into matched_loot
    from public.loot_events loot
    where loot.character_id = new.character_id
      and loot.occurred_at <= new.first_seen_at + interval '5 minutes'
      and (previous_section_sync is null or loot.occurred_at > previous_section_sync)
      and loot.items @> jsonb_build_array(jsonb_build_object('itemId', new.item_id))
    order by loot.occurred_at desc
    limit 1;

    achievement_payload := jsonb_build_object(
      'itemId', new.item_id,
      'sectionKey', new.section_key,
      'sourceAttribution', case when matched_loot.id is null then 'collection_section' else 'loot_event' end
    );
    if matched_loot.id is not null then
      achievement_payload := achievement_payload || jsonb_build_object(
        'sourceName', matched_loot.npc_name,
        'sourceNpcId', matched_loot.npc_id,
        'sourceLootEventId', matched_loot.event_id
      );
    end if;

    insert into public.achievement_events (character_id, type, occurred_at, payload, dedupe_key)
    values (
      new.character_id,
      'collection_unlock',
      new.first_seen_at,
      achievement_payload,
      'collection:' || new.character_id::text || ':' || new.item_id::text
    ) on conflict (dedupe_key) do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.record_loot_collection_unlock()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  loot_item jsonb;
  matching_section_key text;
begin
  for loot_item in select value from jsonb_array_elements(new.items) loop
    select slots.section_key into matching_section_key
    from public.collection_log_slots slots
    where slots.character_id = new.character_id
      and slots.item_id = (loot_item->>'itemId')::integer
      and not slots.obtained
    order by slots.section_key
    limit 1;

    if matching_section_key is not null then
      insert into public.achievement_events (character_id, type, occurred_at, payload, dedupe_key)
      values (
        new.character_id,
        'collection_unlock',
        new.occurred_at,
        jsonb_build_object(
          'itemId', (loot_item->>'itemId')::integer,
          'sectionKey', matching_section_key,
          'sourceAttribution', 'loot_event',
          'sourceName', new.npc_name,
          'sourceNpcId', new.npc_id,
          'sourceLootEventId', new.event_id
        ),
        'collection:' || new.character_id::text || ':' || (loot_item->>'itemId')
      ) on conflict (dedupe_key) do nothing;
    end if;
    matching_section_key := null;
  end loop;
  return new;
end;
$$;

drop trigger if exists loot_events_record_collection_unlock on public.loot_events;
create trigger loot_events_record_collection_unlock
after insert on public.loot_events
for each row execute function public.record_loot_collection_unlock();
