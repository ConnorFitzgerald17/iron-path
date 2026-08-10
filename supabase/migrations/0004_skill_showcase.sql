create table public.character_skill_showcase (
  character_id uuid not null references public.characters(id) on delete cascade,
  skill_key text not null check (skill_key = '*' or skill_key ~ '^[a-z][a-z ]{0,39}$'),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  primary key (character_id, skill_key)
);

alter table public.character_skill_showcase enable row level security;

create policy "owners manage skill showcase" on public.character_skill_showcase for all using (
  exists (select 1 from public.characters c where c.id = character_id and c.user_id = auth.uid())
) with check (
  exists (select 1 from public.characters c where c.id = character_id and c.user_id = auth.uid())
);
