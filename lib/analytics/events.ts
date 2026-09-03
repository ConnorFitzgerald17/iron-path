export const analyticsEventNames = [
  "page_view",
  "login_started",
  "goal_created",
  "goal_completed",
  "goal_reopened",
  "goal_deleted",
  "character_switched",
  "showcase_opened",
  "profile_published",
  "plugin_link_started",
] as const;

export type AnalyticsEventName = (typeof analyticsEventNames)[number];

export type AnalyticsEventProperties = {
  device?: "desktop" | "tablet" | "mobile";
  source?: string;
  goalKind?: "quest" | "grind" | "banked_xp" | "skill";
};
