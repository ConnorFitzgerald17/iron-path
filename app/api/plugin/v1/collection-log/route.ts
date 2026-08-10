import { NextResponse } from "next/server";
import { authenticateDevice } from "@/lib/server/plugin-auth";
import { badRequest, unauthorized } from "@/lib/server/responses";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { collectionLogSectionSchema } from "@/lib/server/collection-log-schema";

export async function POST(request: Request) {
  const device = await authenticateDevice(request);
  if (!device) return unauthorized();
  const parsed = collectionLogSectionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid collection-log section");
  if (parsed.data.obtainedCount > parsed.data.totalCount || parsed.data.slots.length > parsed.data.totalCount) {
    return badRequest("Collection-log counts do not match the section");
  }
  if (!isSupabaseConfigured()) return NextResponse.json({ accepted: true, demo: true, key: parsed.data.key });
  const { error } = await createAdminClient().rpc("ingest_collection_log_section", {
    p_character_id: device.characterId,
    p_device_id: device.deviceId,
    p_section: parsed.data,
  });
  if (error) return NextResponse.json({ error: "collection_log_sync_failed" }, { status: 500 });
  return NextResponse.json({ accepted: true, key: parsed.data.key, capturedAt: parsed.data.capturedAt });
}
