alter type public.goal_kind add value if not exists 'skill';

create or replace function public.sync_skill_goal_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.goals set
    status = case when new.xp >= coalesce((settings->>'targetXp')::bigint, 0) then 'complete' else 'active' end,
    updated_at = now()
  where character_id = new.character_id and kind::text = 'skill' and lower(settings->>'skill') = lower(new.skill);
  return new;
end;
$$;

create trigger character_skills_sync_skill_goals
after insert or update of level, xp on public.character_skills
for each row execute function public.sync_skill_goal_status();

create table public.collection_log_sections (
  character_id uuid not null references public.characters(id) on delete cascade,
  section_key text not null,
  category text not null,
  name text not null,
  obtained_count integer not null check (obtained_count >= 0),
  total_count integer not null check (total_count >= 0),
  captured_at timestamptz not null,
  primary key (character_id, section_key)
);

create table public.collection_log_slots (
  character_id uuid not null,
  section_key text not null,
  item_id integer not null,
  quantity integer not null default 0 check (quantity >= 0),
  obtained boolean not null default false,
  slot_order integer not null default 0,
  primary key (character_id, section_key, item_id),
  foreign key (character_id, section_key) references public.collection_log_sections(character_id, section_key) on delete cascade
);

create table public.collection_log_showcase (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  selection_key text not null,
  selection_type text not null check (selection_type in ('section', 'item')),
  section_key text not null,
  item_id integer,
  display_mode text not null default 'full' check (display_mode in ('full', 'unlocked', 'summary')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (character_id, selection_key),
  check ((selection_type = 'section' and item_id is null) or (selection_type = 'item' and item_id is not null))
);

alter table public.collection_log_sections enable row level security;
alter table public.collection_log_slots enable row level security;
alter table public.collection_log_showcase enable row level security;

create policy "owners read collection log sections" on public.collection_log_sections for select using (
  exists (select 1 from public.characters c where c.id = character_id and c.user_id = auth.uid())
);
create policy "owners read collection log slots" on public.collection_log_slots for select using (
  exists (select 1 from public.characters c where c.id = character_id and c.user_id = auth.uid())
);
create policy "owners manage collection showcase" on public.collection_log_showcase for all using (
  exists (select 1 from public.characters c where c.id = character_id and c.user_id = auth.uid())
) with check (
  exists (select 1 from public.characters c where c.id = character_id and c.user_id = auth.uid())
);

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

  insert into collection_log_sections (character_id, section_key, category, name, obtained_count, total_count, captured_at)
  values (p_character_id, key, p_section->>'category', p_section->>'name',
    (p_section->>'obtainedCount')::integer, (p_section->>'totalCount')::integer, captured)
  on conflict (character_id, section_key) do update set
    category = excluded.category, name = excluded.name, obtained_count = excluded.obtained_count,
    total_count = excluded.total_count, captured_at = excluded.captured_at;

  delete from collection_log_slots where character_id = p_character_id and section_key = key;
  insert into collection_log_slots (character_id, section_key, item_id, quantity, obtained, slot_order)
  select p_character_id, key, (value->>'itemId')::integer, (value->>'quantity')::integer,
    (value->>'obtained')::boolean, (value->>'slotOrder')::integer
  from jsonb_array_elements(p_section->'slots');
end;
$$;
