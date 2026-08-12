import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedUser, ownedCharacter } from "@/lib/server/app-auth";
import { createAdminClient } from "@/lib/supabase/server";

const selectionSchema = z.object({
  characterId: z.string().uuid(),
  selectionType: z.enum(["section", "item"]),
  sectionKey: z.string().min(1).max(160),
  itemId: z.number().int().positive().optional(),
  public: z.boolean(),
  displayMode: z.enum(["full", "unlocked", "summary"]).default("full"),
  sortOrder: z.number().int().nonnegative().default(0),
}).refine((value) => value.selectionType === "section" ? value.itemId === undefined : value.itemId !== undefined, "Invalid collection selection");

const schema = z.union([selectionSchema, z.object({
  characterId: z.string().uuid(),
  selectionType: z.literal("recent"),
  public: z.boolean(),
})]);

export async function PATCH(request: Request) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid_selection" }, { status: 400 });
  if (!await ownedCharacter(parsed.data.characterId, user.id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const admin = createAdminClient();
  if (parsed.data.selectionType === "recent") {
    const { error } = await admin.from("characters").update({ show_recent_collections: parsed.data.public }).eq("id", parsed.data.characterId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  const selectionKey = parsed.data.selectionType === "section" ? `section:${parsed.data.sectionKey}` : `item:${parsed.data.sectionKey}:${parsed.data.itemId}`;
  if (!parsed.data.public) {
    const { error } = await admin.from("collection_log_showcase").delete().eq("character_id", parsed.data.characterId).eq("selection_key", selectionKey);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  const { error } = await admin.from("collection_log_showcase").upsert({
    character_id: parsed.data.characterId,
    selection_key: selectionKey,
    selection_type: parsed.data.selectionType,
    section_key: parsed.data.sectionKey,
    item_id: parsed.data.itemId ?? null,
    display_mode: parsed.data.displayMode,
    sort_order: parsed.data.sortOrder,
  }, { onConflict: "character_id,selection_key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
