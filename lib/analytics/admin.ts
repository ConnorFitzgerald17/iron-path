import type { User } from "@supabase/supabase-js";

const allowedRanges = [7, 30, 90] as const;
export type AnalyticsRange = (typeof allowedRanges)[number];

function analyticsAdminEmails() {
  return (process.env.ANALYTICS_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAnalyticsAdmin(user: Pick<User, "email"> | null | undefined) {
  return Boolean(user?.email && analyticsAdminEmails().includes(user.email.toLowerCase()));
}

export function analyticsRange(value: string | string[] | undefined): AnalyticsRange {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return allowedRanges.includes(parsed as AnalyticsRange) ? parsed as AnalyticsRange : 30;
}
