create table public.analytics_events (
  id bigint generated always as identity primary key,
  event_id uuid not null unique,
  user_id uuid references auth.users(id) on delete cascade,
  visitor_id uuid not null,
  session_id uuid not null,
  event_name text not null check (event_name in (
    'page_view',
    'login_started',
    'goal_created',
    'goal_completed',
    'goal_reopened',
    'goal_deleted',
    'character_switched',
    'showcase_opened',
    'profile_published',
    'plugin_link_started'
  )),
  path text not null check (char_length(path) between 1 and 160 and path like '/%'),
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

alter table public.analytics_events enable row level security;

-- Analytics is written and read through authenticated server routes only. With
-- RLS enabled and no client policy, neither anonymous nor signed-in clients can
-- query the raw event stream directly.
revoke all on public.analytics_events from anon, authenticated;
grant all on public.analytics_events to service_role;
grant usage, select on sequence public.analytics_events_id_seq to service_role;

create index analytics_events_occurred_at_idx on public.analytics_events (occurred_at desc);
create index analytics_events_user_occurred_idx on public.analytics_events (user_id, occurred_at desc) where user_id is not null;
create index analytics_events_visitor_occurred_idx on public.analytics_events (visitor_id, occurred_at desc);
create index analytics_events_name_occurred_idx on public.analytics_events (event_name, occurred_at desc);

create or replace function public.get_analytics_dashboard(p_since timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with period_events as (
    select
      ae.*,
      coalesce('user:' || ae.user_id::text, 'visitor:' || ae.visitor_id::text) as identity_key
    from public.analytics_events ae
    where ae.occurred_at >= p_since
      and ae.path <> '/analytics'
  ),
  totals as (
    select
      count(distinct identity_key)::integer as visitors,
      count(distinct session_id)::integer as sessions,
      count(*) filter (where event_name = 'page_view')::integer as page_views,
      count(*) filter (where event_name <> 'page_view')::integer as actions
    from period_events
  ),
  repeat_visitors as (
    select count(*)::integer as visitors
    from (
      select identity_key
      from period_events
      group by identity_key
      having count(distinct session_id) > 1
    ) repeated
  ),
  member_totals as (
    select
      count(*)::integer as total,
      count(*) filter (where created_at >= p_since)::integer as new_members
    from auth.users
  ),
  active_members as (
    select count(distinct user_id)::integer as total
    from period_events
    where user_id is not null
  ),
  plugin_members as (
    select count(distinct user_id)::integer as total
    from public.characters
    where last_synced_at >= p_since
  ),
  daily_rows as (
    select
      day::date as date,
      count(*) filter (where pe.event_name = 'page_view')::integer as page_views,
      count(distinct pe.session_id)::integer as sessions,
      count(distinct pe.identity_key)::integer as visitors
    from generate_series(
      date_trunc('day', p_since),
      date_trunc('day', now()),
      interval '1 day'
    ) day
    left join period_events pe
      on pe.occurred_at >= day
      and pe.occurred_at < day + interval '1 day'
    group by day
    order by day
  ),
  page_rows as (
    select
      path,
      count(*)::integer as views,
      count(distinct identity_key)::integer as visitors
    from period_events
    where event_name = 'page_view'
    group by path
    order by views desc, path
    limit 12
  ),
  event_rows as (
    select
      event_name as name,
      count(*)::integer as count,
      count(distinct identity_key)::integer as visitors
    from period_events
    where event_name <> 'page_view'
    group by event_name
    order by count desc, event_name
  ),
  device_rows as (
    select
      coalesce(nullif(properties->>'device', ''), 'unknown') as name,
      count(distinct identity_key)::integer as visitors
    from period_events
    where event_name = 'page_view'
    group by name
    order by visitors desc, name
  ),
  source_rows as (
    select
      coalesce(nullif(properties->>'source', ''), 'Direct') as name,
      count(distinct identity_key)::integer as visitors
    from period_events
    where event_name = 'page_view'
    group by name
    order by visitors desc, name
    limit 8
  ),
  funnel as (
    select jsonb_build_object(
      'visited', count(distinct identity_key),
      'viewedLanding', count(distinct identity_key) filter (where event_name = 'page_view' and path = '/'),
      'viewedLogin', count(distinct identity_key) filter (where event_name = 'page_view' and path = '/login'),
      'openedJournal', count(distinct identity_key) filter (where event_name = 'page_view' and path = '/journal')
    ) as data
    from period_events
  ),
  user_activity as (
    select
      user_id,
      max(occurred_at) as last_active_at,
      count(distinct session_id)::integer as sessions,
      count(*) filter (where event_name = 'page_view')::integer as page_views,
      count(*) filter (where event_name <> 'page_view')::integer as actions
    from period_events
    where user_id is not null
    group by user_id
  ),
  character_rollup as (
    select
      user_id,
      count(*)::integer as character_count,
      max(last_synced_at) as last_synced_at,
      jsonb_agg(name order by created_at) as character_names
    from public.characters
    group by user_id
  ),
  user_rows as (
    select
      au.id,
      au.email,
      au.created_at,
      au.last_sign_in_at,
      ua.last_active_at,
      coalesce(ua.sessions, 0) as sessions,
      coalesce(ua.page_views, 0) as page_views,
      coalesce(ua.actions, 0) as actions,
      coalesce(cr.character_count, 0) as character_count,
      cr.last_synced_at,
      coalesce(cr.character_names, '[]'::jsonb) as character_names
    from auth.users au
    left join user_activity ua on ua.user_id = au.id
    left join character_rollup cr on cr.user_id = au.id
    where ua.user_id is not null or au.created_at >= p_since or cr.last_synced_at >= p_since
    order by ua.last_active_at desc nulls last, cr.last_synced_at desc nulls last, au.created_at desc
    limit 100
  )
  select jsonb_build_object(
    'generatedAt', now(),
    'since', p_since,
    'totals', jsonb_build_object(
      'visitors', totals.visitors,
      'returningVisitors', repeat_visitors.visitors,
      'sessions', totals.sessions,
      'pageViews', totals.page_views,
      'actions', totals.actions,
      'members', member_totals.total,
      'newMembers', member_totals.new_members,
      'activeMembers', active_members.total,
      'pluginActiveMembers', plugin_members.total
    ),
    'daily', coalesce((select jsonb_agg(to_jsonb(daily_rows)) from daily_rows), '[]'::jsonb),
    'pages', coalesce((select jsonb_agg(to_jsonb(page_rows)) from page_rows), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(to_jsonb(event_rows)) from event_rows), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(to_jsonb(device_rows)) from device_rows), '[]'::jsonb),
    'sources', coalesce((select jsonb_agg(to_jsonb(source_rows)) from source_rows), '[]'::jsonb),
    'funnel', (select data from funnel),
    'users', coalesce((select jsonb_agg(to_jsonb(user_rows)) from user_rows), '[]'::jsonb)
  )
  from totals, repeat_visitors, member_totals, active_members, plugin_members;
$$;

revoke all on function public.get_analytics_dashboard(timestamptz) from public, anon, authenticated;
grant execute on function public.get_analytics_dashboard(timestamptz) to service_role;
