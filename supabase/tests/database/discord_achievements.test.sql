begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

select has_table('public', 'achievement_events', 'achievement events table exists');
select has_function('public', 'claim_discord_deliveries', array['integer'], 'delivery claim function exists');
select ok(has_table_privilege('service_role', 'public.achievement_events', 'SELECT'), 'service role can load achievements');
select ok(not has_function_privilege('anon', 'public.consume_discord_link_code(uuid,text)', 'EXECUTE'), 'anonymous callers cannot consume Discord links');

insert into auth.users (id, email, raw_user_meta_data)
values ('11111111-1111-4111-8111-111111111111', 'discord-test@example.com', '{}');
insert into public.characters (id, user_id, name, slug)
values ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'Test Iron', 'discord-test');
insert into public.discord_guilds (guild_id, achievement_channel_id, configured_by_discord_user_id)
values ('123456789012345', '223456789012345', '323456789012345');
insert into public.discord_guild_memberships (guild_id, discord_user_id, character_id)
values ('123456789012345', '323456789012345', '22222222-2222-4222-8222-222222222222');
insert into public.plugin_devices (id, character_id, token_hash, label)
values ('44444444-4444-4444-8444-444444444444', '22222222-2222-4222-8222-222222222222', 'discord-test-token', 'Test RuneLite');
insert into public.collection_log_sections (character_id, section_key, category, name, obtained_count, total_count, captured_at)
values ('22222222-2222-4222-8222-222222222222', 'abyssal_sire', 'Bosses', 'Abyssal Sire', 0, 1, now() - interval '1 hour');
insert into public.loot_events (event_id, character_id, device_id, occurred_at, npc_id, npc_name, items)
values (
  '55555555-5555-4555-8555-555555555555',
  '22222222-2222-4222-8222-222222222222',
  '44444444-4444-4444-8444-444444444444',
  now() - interval '1 minute', 5886, 'Abyssal Sire', '[{"itemId":4151,"quantity":1}]'
);

insert into public.goals (id, character_id, kind, title, status)
values ('33333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222', 'grind', 'Get the drop', 'active');
update public.goals set status = 'complete', updated_at = now()
where id = '33333333-3333-4333-8333-333333333333';
insert into public.collection_log_recent_items (character_id, item_id, section_key, first_seen_at, source)
values ('22222222-2222-4222-8222-222222222222', 4151, 'abyssal_sire', now(), 'unlock');

select is((select count(*) from public.achievement_events where character_id = '22222222-2222-4222-8222-222222222222'), 2::bigint, 'goal and collection transitions create two achievements');
select is((select count(*) from public.discord_deliveries delivery join public.achievement_events event on event.id = delivery.event_id where event.character_id = '22222222-2222-4222-8222-222222222222' and delivery.status = 'pending'), 2::bigint, 'each achievement queues one clan delivery');
select is(
  (select payload->>'sourceName' from public.achievement_events where character_id = '22222222-2222-4222-8222-222222222222' and type = 'collection_unlock'),
  'Abyssal Sire',
  'collection achievement records an exact matching RuneLite loot source'
);

select * from finish();
rollback;
