import { NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/server/app-auth";
import { characterSummary, type CharacterSummaryRow } from "@/lib/server/characters";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ characterId: string }> }) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { characterId } = await params;
  const admin = createAdminClient();
  const characterResult = await admin.from("characters")
    .select("id, name, slug, account_type, combat_level, total_level, visibility, last_synced_at, created_at")
    .eq("id", characterId).eq("user_id", user.id).maybeSingle();
  if (characterResult.error) return NextResponse.json({ error: characterResult.error.message }, { status: 500 });
  if (!characterResult.data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [skills, quests, items, goals] = await Promise.all([
    admin.from("character_skills").select("skill, level, xp").eq("character_id", characterId),
    admin.from("character_quests").select("quest_key, state").eq("character_id", characterId),
    admin.from("character_items").select("item_id, quantity, container").eq("character_id", characterId),
    admin.from("goals").select("id, status").eq("character_id", characterId).eq("archived", false),
  ]);
  const error = skills.error ?? quests.error ?? items.error ?? goals.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const summary = characterSummary(characterResult.data as CharacterSummaryRow);
  const { createdAt: _createdAt, ...character } = summary;
  void _createdAt;
  return NextResponse.json({
    character,
    skills: (skills.data ?? []).map((row) => ({ skill: String(row.skill), level: Number(row.level), xp: Number(row.xp) })),
    quests: (quests.data ?? []).map((row) => ({ quest: String(row.quest_key), state: row.state })),
    items: (items.data ?? []).map((row) => ({ itemId: Number(row.item_id), quantity: Number(row.quantity), container: row.container })),
    goals: (goals.data ?? []).map((row) => ({ id: String(row.id), status: row.status })),
  });
}
