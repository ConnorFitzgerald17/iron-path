import { NextResponse } from "next/server";
import { achievementDiscordMessage } from "@/lib/server/discord";
import { loadAchievementById } from "@/lib/server/achievements";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

type Delivery = { id: number; event_id: number; channel_id: string; attempts: number };

export async function POST(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured() || !process.env.DISCORD_BOT_TOKEN) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_discord_deliveries", { p_limit: 25 });
  if (error) return NextResponse.json({ error: "claim_failed" }, { status: 500 });

  let sent = 0;
  let failed = 0;
  for (const delivery of (data ?? []) as Delivery[]) {
    const achievement = await loadAchievementById(Number(delivery.event_id));
    if (!achievement) {
      await admin.from("discord_deliveries").update({ status: "failed", attempts: 6, last_error: "achievement_not_found", updated_at: new Date().toISOString() }).eq("id", delivery.id);
      failed++;
      continue;
    }
    try {
      const response = await fetch(`https://discord.com/api/v10/channels/${delivery.channel_id}/messages`, {
        method: "POST",
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify(achievementDiscordMessage(achievement)),
      });
      const responseBody = await response.json().catch(() => ({})) as { id?: string; retry_after?: number; message?: string };
      if (!response.ok) {
        const permanent = response.status === 403 || response.status === 404;
        const retrySeconds = response.status === 429 ? Math.max(1, Number(responseBody.retry_after ?? 1)) : Math.min(3600, 30 * 2 ** delivery.attempts);
        await admin.from("discord_deliveries").update({
          status: "failed",
          attempts: permanent ? 6 : delivery.attempts,
          next_attempt_at: new Date(Date.now() + retrySeconds * 1000).toISOString(),
          last_error: `${response.status}:${responseBody.message ?? "discord_error"}`.slice(0, 500),
          updated_at: new Date().toISOString(),
        }).eq("id", delivery.id);
        failed++;
        continue;
      }
      await admin.from("discord_deliveries").update({ status: "sent", message_id: responseBody.id ?? null, last_error: null, updated_at: new Date().toISOString() }).eq("id", delivery.id);
      sent++;
    } catch (dispatchError) {
      await admin.from("discord_deliveries").update({
        status: "failed",
        next_attempt_at: new Date(Date.now() + Math.min(3600, 30 * 2 ** delivery.attempts) * 1000).toISOString(),
        last_error: dispatchError instanceof Error ? dispatchError.message.slice(0, 500) : "network_error",
        updated_at: new Date().toISOString(),
      }).eq("id", delivery.id);
      failed++;
    }
  }
  return NextResponse.json({ claimed: (data ?? []).length, sent, failed });
}
