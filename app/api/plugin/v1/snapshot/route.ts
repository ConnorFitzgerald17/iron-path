import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateDevice } from "@/lib/server/plugin-auth";
import { badRequest, unauthorized } from "@/lib/server/responses";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

const snapshotSchema = z.object({
  capturedAt: z.string().datetime(), characterName: z.string().min(1).max(12),
  skills: z.array(z.object({ skill: z.string(), level: z.number().int().min(1).max(126), xp: z.number().int().nonnegative() })).max(40),
  quests: z.array(z.object({ quest: z.string(), state: z.enum(["not_started", "in_progress", "finished"]) })).max(300),
  items: z.array(z.object({ itemId: z.number().int().positive(), quantity: z.number().int().nonnegative(), container: z.enum(["bank", "inventory", "equipment"]) })).max(2000)
});

export async function POST(request: Request) {
  const device = await authenticateDevice(request);
  if (!device) return unauthorized();
  const parsed = snapshotSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid snapshot");
  if (!isSupabaseConfigured()) return NextResponse.json({ accepted: true, demo: true, capturedAt: parsed.data.capturedAt });
  const { error } = await createAdminClient().rpc("ingest_plugin_snapshot", {
    p_character_id: device.characterId,
    p_device_id: device.deviceId,
    p_snapshot: parsed.data
  });
  if (error) return NextResponse.json({ error: "snapshot_failed" }, { status: 500 });
  return NextResponse.json({ accepted: true, capturedAt: parsed.data.capturedAt });
}
