import "server-only";

import type { AnalyticsRange } from "@/lib/analytics/admin";
import { createAdminClient } from "@/lib/supabase/server";

export { analyticsRange, isAnalyticsAdmin } from "@/lib/analytics/admin";

export type AnalyticsDashboard = {
  generatedAt: string;
  since: string;
  totals: {
    visitors: number;
    returningVisitors: number;
    sessions: number;
    pageViews: number;
    actions: number;
    members: number;
    newMembers: number;
    activeMembers: number;
    pluginActiveMembers: number;
  };
  daily: Array<{ date: string; visitors: number; sessions: number; pageViews: number }>;
  pages: Array<{ path: string; views: number; visitors: number }>;
  events: Array<{ name: string; count: number; visitors: number }>;
  devices: Array<{ name: string; visitors: number }>;
  sources: Array<{ name: string; visitors: number }>;
  funnel: { visited: number; viewedLanding: number; viewedLogin: number; openedJournal: number };
  users: Array<{
    id: string;
    email: string;
    createdAt: string;
    lastSignInAt: string | null;
    lastActiveAt: string | null;
    sessions: number;
    pageViews: number;
    actions: number;
    characterCount: number;
    lastSyncedAt: string | null;
    characterNames: string[];
  }>;
};

type RawDashboard = {
  generatedAt?: string;
  since?: string;
  totals?: Partial<AnalyticsDashboard["totals"]>;
  daily?: Array<{ date: string; visitors: number; sessions: number; page_views: number }>;
  pages?: AnalyticsDashboard["pages"];
  events?: AnalyticsDashboard["events"];
  devices?: AnalyticsDashboard["devices"];
  sources?: AnalyticsDashboard["sources"];
  funnel?: Partial<AnalyticsDashboard["funnel"]>;
  users?: Array<{
    id: string;
    email: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    last_active_at: string | null;
    sessions: number;
    page_views: number;
    actions: number;
    character_count: number;
    last_synced_at: string | null;
    character_names: string[];
  }>;
};

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export async function loadAnalyticsDashboard(days: AnalyticsRange): Promise<AnalyticsDashboard> {
  const since = new Date(Date.now() - (days - 1) * 86_400_000);
  since.setUTCHours(0, 0, 0, 0);
  const { data, error } = await createAdminClient().rpc("get_analytics_dashboard", { p_since: since.toISOString() });
  if (error) throw new Error(`Could not load analytics: ${error.message}`);
  const raw = (data ?? {}) as RawDashboard;
  const totals = raw.totals ?? {};
  const funnel = raw.funnel ?? {};

  return {
    generatedAt: raw.generatedAt ?? new Date().toISOString(),
    since: raw.since ?? since.toISOString(),
    totals: {
      visitors: number(totals.visitors),
      returningVisitors: number(totals.returningVisitors),
      sessions: number(totals.sessions),
      pageViews: number(totals.pageViews),
      actions: number(totals.actions),
      members: number(totals.members),
      newMembers: number(totals.newMembers),
      activeMembers: number(totals.activeMembers),
      pluginActiveMembers: number(totals.pluginActiveMembers),
    },
    daily: (raw.daily ?? []).map((row) => ({ ...row, pageViews: number(row.page_views) })),
    pages: raw.pages ?? [],
    events: raw.events ?? [],
    devices: raw.devices ?? [],
    sources: raw.sources ?? [],
    funnel: {
      visited: number(funnel.visited),
      viewedLanding: number(funnel.viewedLanding),
      viewedLogin: number(funnel.viewedLogin),
      openedJournal: number(funnel.openedJournal),
    },
    users: (raw.users ?? []).map((user) => ({
      id: user.id,
      email: user.email ?? "Email unavailable",
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
      lastActiveAt: user.last_active_at,
      sessions: number(user.sessions),
      pageViews: number(user.page_views),
      actions: number(user.actions),
      characterCount: number(user.character_count),
      lastSyncedAt: user.last_synced_at,
      characterNames: Array.isArray(user.character_names) ? user.character_names : [],
    })),
  };
}
