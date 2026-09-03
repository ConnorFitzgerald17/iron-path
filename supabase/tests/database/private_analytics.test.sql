begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select has_table('public', 'analytics_events', 'analytics events table exists');
select has_function('public', 'get_analytics_dashboard', array['timestamp with time zone'], 'analytics dashboard function exists');
select ok(has_table_privilege('service_role', 'public.analytics_events', 'SELECT'), 'service role can read analytics');
select ok(not has_table_privilege('anon', 'public.analytics_events', 'SELECT'), 'anonymous callers cannot read analytics');
select ok(not has_function_privilege('authenticated', 'public.get_analytics_dashboard(timestamp with time zone)', 'EXECUTE'), 'signed-in members cannot load the owner dashboard RPC');

insert into auth.users (id, email, raw_user_meta_data)
values ('61111111-1111-4111-8111-111111111111', 'analytics-test@example.com', '{}');
insert into public.characters (id, user_id, name, slug, last_synced_at)
values ('62222222-2222-4222-8222-222222222222', '61111111-1111-4111-8111-111111111111', 'Test Path', 'analytics-test', now());
insert into public.analytics_events (event_id, user_id, visitor_id, session_id, event_name, path, properties)
values
  ('63333333-3333-4333-8333-333333333331', '61111111-1111-4111-8111-111111111111', '64444444-4444-4444-8444-444444444444', '65555555-5555-4555-8555-555555555555', 'page_view', '/journal', '{"device":"desktop","source":"Direct"}'),
  ('63333333-3333-4333-8333-333333333332', '61111111-1111-4111-8111-111111111111', '64444444-4444-4444-8444-444444444444', '65555555-5555-4555-8555-555555555555', 'goal_created', '/journal', '{"goalKind":"quest"}');

select is((public.get_analytics_dashboard(now() - interval '1 day')->'totals'->>'visitors')::integer, 1, 'dashboard counts unique visitors');
select is((public.get_analytics_dashboard(now() - interval '1 day')->'totals'->>'pageViews')::integer, 1, 'dashboard counts page views');
select is((public.get_analytics_dashboard(now() - interval '1 day')->'totals'->>'actions')::integer, 1, 'dashboard counts product actions');
select is(public.get_analytics_dashboard(now() - interval '1 day')->'users'->0->>'email', 'analytics-test@example.com', 'dashboard identifies active signed-in members');

select * from finish();
rollback;
