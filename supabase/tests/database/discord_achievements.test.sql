begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select has_table('public', 'achievement_events', 'achievement events table exists');
select has_function('public', 'claim_discord_deliveries', array['integer'], 'delivery claim function exists');

insert into auth.users (id, email, raw_user_meta_data)
values ('11111111-1111-4111-8111-111111111111', 'discord-test@example.com', '{}');
insert into public.characters (id, user_id, name, slug)
values ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'Test Iron', 'discord-test');
insert into public.discord_guilds (guild_id, achievement_channel_id, configured_by_discord_user_id)
values ('123456789012345', '223456789012345', '323456789012345');
insert into public.discord_guild_memberships (guild_id, discord_user_id, character_id)
values ('123456789012345', '323456789012345', '22222222-2222-4222-8222-222222222222');

insert into public.goals (id, character_id, kind, title, status)
values ('33333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222', 'grind', 'Get the drop', 'active');
update public.goals set status = 'complete', updated_at = now()
where id = '33333333-3333-4333-8333-333333333333';
insert into public.collection_log_recent_items (character_id, item_id, section_key, first_seen_at, source)
values ('22222222-2222-4222-8222-222222222222', 4151, 'abyssal_sire', now(), 'unlock');

select is((select count(*) from public.achievement_events), 2::bigint, 'goal and collection transitions create two achievements');
select is((select count(*) from public.discord_deliveries where status = 'pending'), 2::bigint, 'each achievement queues one clan delivery');

select * from finish();
rollback;

