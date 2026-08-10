import { NextResponse } from "next/server";
import { authenticateDevice } from "@/lib/server/plugin-auth";
import { badRequest, unauthorized } from "@/lib/server/responses";
import { snapshotSchema } from "@/lib/server/snapshot-schema";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

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
