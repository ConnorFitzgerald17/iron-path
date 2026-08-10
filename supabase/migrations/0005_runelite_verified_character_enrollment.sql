alter table public.plugin_link_codes alter column character_id drop not null;
alter table public.plugin_link_codes add column user_id uuid references auth.users(id) on delete cascade;
alter table public.plugin_link_codes add constraint plugin_link_codes_has_owner check (character_id is not null or user_id is not null);

update public.characters set visibility = 'private' where visibility = 'public' and last_synced_at is null;
alter table public.characters add constraint public_character_requires_runelite_sync
  check (visibility = 'private' or last_synced_at is not null);

create index plugin_link_codes_user_pending_idx
  on public.plugin_link_codes(user_id, expires_at desc)
  where used_at is null;

-- Profile creation and character mutations must go through the server-side API.
-- This prevents an authenticated browser client from reserving a name or slug
-- without first completing RuneLite verification.
drop policy if exists "owners manage characters" on public.characters;
create policy "owners read characters" on public.characters for select
  using (auth.uid() = user_id);

drop policy if exists "owners manage link codes" on public.plugin_link_codes;
drop policy if exists "owners manage enrollment link codes" on public.plugin_link_codes;

create or replace function public.claim_plugin_enrollment(
  p_code_hash text,
  p_character_name text,
  p_base_slug text,
  p_token_hash text,
  p_client_version text default null
)
returns table(character_id uuid, device_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  link_row public.plugin_link_codes%rowtype;
  new_character_id uuid;
  new_device_id uuid;
  candidate_slug text := p_base_slug;
begin
  select * into link_row
  from public.plugin_link_codes
  where code_hash = p_code_hash
  for update;

  if not found
    or link_row.used_at is not null
    or link_row.expires_at <= now()
    or link_row.user_id is null
    or link_row.character_id is not null then
    raise exception 'invalid_or_expired_code';
  end if;

  if (select count(*) from public.characters where user_id = link_row.user_id) >= 5 then
    raise exception 'character_limit';
  end if;

  while exists (select 1 from public.characters where slug = candidate_slug) loop
    candidate_slug := left(p_base_slug, 32) || '-' || left(replace(gen_random_uuid()::text, '-', ''), 6);
  end loop;

  insert into public.characters (user_id, name, slug, account_type)
  values (link_row.user_id, p_character_name, candidate_slug, 'Unknown')
  returning id into new_character_id;

  insert into public.plugin_devices (character_id, token_hash, label, client_version)
  values (new_character_id, p_token_hash, p_character_name, p_client_version)
  returning id into new_device_id;

  update public.plugin_link_codes
  set character_id = new_character_id, device_id = new_device_id, used_at = now()
  where id = link_row.id;

  return query select new_character_id, new_device_id;
end;
$$;

revoke all on function public.claim_plugin_enrollment(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.claim_plugin_enrollment(text, text, text, text, text) to service_role;
