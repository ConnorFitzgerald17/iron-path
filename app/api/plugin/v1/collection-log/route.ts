import { NextResponse } from "next/server";
import { authenticateDevice } from "@/lib/server/plugin-auth";
import { badRequest, unauthorized } from "@/lib/server/responses";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { collectionLogSyncSchema } from "@/lib/server/collection-log-schema";

export async function POST(request: Request) {
  const device = await authenticateDevice(request);
  if (!device) return unauthorized();
  const parsed = collectionLogSyncSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid collection-log sync");
  if (parsed.data.sections.some((section) => section.obtainedCount > section.totalCount || section.slots.length > section.totalCount)) {
    return badRequest("Collection-log counts do not match a section");
  }
  if (!isSupabaseConfigured()) return NextResponse.json({ accepted: true, demo: true, capturedAt: parsed.data.capturedAt });
  const admin = createAdminClient();
  const { error } = await admin.rpc("ingest_collection_log_sync", {
    p_character_id: device.characterId,
    p_device_id: device.deviceId,
    p_sync: parsed.data,
  });
  if (error) return NextResponse.json({ error: "collection_log_sync_failed" }, { status: 500 });
  // RuneLite's recent-items overview is a separate interface and may not be
  // loaded during a full-log sync. An empty list means "not captured", so it
  // must not erase the last overview that was captured successfully.
  if (parsed.data.recentItemIds.length > 0) {
    const { error: orderError } = await admin.from("collection_log_recent_items").update({ overview_order: null })
      .eq("character_id", device.characterId).not("overview_order", "is", null)
      .not("item_id", "in", `(${parsed.data.recentItemIds.join(",")})`);
    if (orderError) return NextResponse.json({ error: "collection_log_recent_prune_failed" }, { status: 500 });
    const { error: recentError } = await admin.from("collection_log_recent_items").delete()
      .eq("character_id", device.characterId).eq("source", "overview").is("overview_order", null);
    if (recentError) return NextResponse.json({ error: "collection_log_recent_prune_failed" }, { status: 500 });
  }
  return NextResponse.json({ accepted: true, sections: parsed.data.sections.length, capturedAt: parsed.data.capturedAt });
}
