import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedUser, ownedCharacter } from "@/lib/server/app-auth";
import { createAdminClient } from "@/lib/supabase/server";

const schema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("skill"), characterId: z.string().uuid(), skill: z.string().min(1), level: z.number().int().min(1).max(999), xp: z.number().int().nonnegative().optional() }),
  z.object({ type: z.literal("item"), characterId: z.string().uuid(), itemId: z.number().int().positive(), quantity: z.number().int().nonnegative() }),
  z.object({ type: z.literal("quest"), characterId: z.string().uuid(), quest: z.string().min(1), state: z.enum(["not_started", "in_progress", "finished"]) }),
]);

export async function PATCH(request: Request) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid_update" }, { status: 400 });
  if (!await ownedCharacter(parsed.data.characterId, user.id)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const admin = createAdminClient();
  const capturedAt = new Date().toISOString();
  let error: { message: string } | null = null;
  if (parsed.data.type === "skill") {
    ({ error } = await admin.from("character_skills").upsert({ character_id: parsed.data.characterId, skill: parsed.data.skill, level: parsed.data.level, xp: parsed.data.xp ?? 0, captured_at: capturedAt }, { onConflict: "character_id,skill" }));
    if (!error) {
      const { data: skillRows } = await admin.from("character_skills").select("skill, level").eq("character_id", parsed.data.characterId);
      const total = (skillRows ?? []).filter((row) => !/^quest points?$/i.test(String(row.skill))).reduce((sum, row) => sum + Number(row.level), 0);
      await admin.from("characters").update({ total_level: Math.max(32, total), updated_at: capturedAt }).eq("id", parsed.data.characterId);
    }
  } else if (parsed.data.type === "item") {
    ({ error } = await admin.from("character_items").upsert({ character_id: parsed.data.characterId, item_id: parsed.data.itemId, container: "bank", quantity: parsed.data.quantity, captured_at: capturedAt }, { onConflict: "character_id,item_id,container" }));
  } else {
    ({ error } = await admin.from("character_quests").upsert({ character_id: parsed.data.characterId, quest_key: parsed.data.quest, state: parsed.data.state, captured_at: capturedAt }, { onConflict: "character_id,quest_key" }));
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
