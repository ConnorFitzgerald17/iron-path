import { after, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateDevice } from "@/lib/server/plugin-auth";
import { badRequest, unauthorized } from "@/lib/server/responses";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { dispatchDiscordDeliveries } from "@/lib/server/discord-dispatch";

const schema = z.object({ events: z.array(z.object({
  eventId: z.string().uuid(), occurredAt: z.string().datetime(), npcId: z.number().int(), npcName: z.string().max(100),
  items: z.array(z.object({ itemId: z.number().int().positive(), quantity: z.number().int().positive() })).max(50)
})).min(1).max(250) });

export async function POST(request: Request) {
  const device = await authenticateDevice(request);
  if (!device) return unauthorized();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid event batch");
  if (!isSupabaseConfigured()) return NextResponse.json({ accepted: parsed.data.events.length, duplicates: 0, demo: true });
  const rows = parsed.data.events.map((event) => ({
    event_id: event.eventId, character_id: device.characterId, device_id: device.deviceId,
    occurred_at: event.occurredAt, npc_id: event.npcId, npc_name: event.npcName, items: event.items
  }));
  const { error } = await createAdminClient().from("loot_events").upsert(rows, { onConflict: "device_id,event_id", ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: "loot_ingest_failed" }, { status: 500 });
  after(async () => {
    try {
      await dispatchDiscordDeliveries();
    } catch (error) {
      console.error("Discord achievement dispatch failed after loot ingest", error);
    }
  });
  return NextResponse.json({ accepted: rows.length });
}
