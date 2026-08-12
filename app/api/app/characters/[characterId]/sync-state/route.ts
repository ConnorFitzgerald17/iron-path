import { NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/server/app-auth";
import { characterSummary, type CharacterSummaryRow } from "@/lib/server/characters";
import { createAdminClient } from "@/lib/supabase/server";
import { loadCharacterProfile, type CharacterRow } from "@/lib/server/profile";

export async function GET(request: Request, { params }: { params: Promise<{ characterId: string }> }) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { characterId } = await params;
  const admin = createAdminClient();
  const characterResult = await admin.from("characters")
    .select("id, name, slug, account_type, combat_level, total_level, visibility, last_synced_at, show_recent_collections, created_at")
    .eq("id", characterId).eq("user_id", user.id).maybeSingle();
  if (characterResult.error) return NextResponse.json({ error: characterResult.error.message }, { status: 500 });
  if (!characterResult.data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [skills, quests, items, goals, killCounts, collectionMarker] = await Promise.all([
    admin.from("character_skills").select("skill, level, xp").eq("character_id", characterId),
    admin.from("character_quests").select("quest_key, state").eq("character_id", characterId),
    admin.from("character_items").select("item_id, quantity, container").eq("character_id", characterId),
    admin.from("goals").select("id, status").eq("character_id", characterId).eq("archived", false),
    admin.from("character_kill_counts").select("source_name, count, captured_at").eq("character_id", characterId),
    admin.from("collection_log_sections").select("captured_at").eq("character_id", characterId)
      .order("captured_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const error = skills.error ?? quests.error ?? items.error ?? goals.error ?? killCounts.error ?? collectionMarker.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const summary = characterSummary(characterResult.data as CharacterSummaryRow);
  const { createdAt: _createdAt, ...character } = summary;
  void _createdAt;
  const latestCollection = collectionMarker.data?.captured_at ? String(collectionMarker.data.captured_at) : undefined;
  const requestedMarker = new URL(request.url).searchParams.get("collectionAfter") ?? undefined;
  const collectionChanged = latestCollection !== requestedMarker;
  const collection = collectionChanged && latestCollection
    ? await loadCharacterProfile(characterResult.data as CharacterRow)
    : undefined;
  return NextResponse.json({
    character,
    skills: (skills.data ?? []).map((row) => ({ skill: String(row.skill), level: Number(row.level), xp: Number(row.xp) })),
    quests: (quests.data ?? []).map((row) => ({ quest: String(row.quest_key), state: row.state })),
    items: (items.data ?? []).map((row) => ({ itemId: Number(row.item_id), quantity: Number(row.quantity), container: row.container })),
    goals: (goals.data ?? []).map((row) => ({ id: String(row.id), status: row.status })),
    killCounts: (killCounts.data ?? []).map((row) => ({
      sourceName: String(row.source_name), count: Number(row.count), capturedAt: String(row.captured_at),
    })),
    collectionLogUpdatedAt: latestCollection,
    ...(collection ? {
      collectionLog: collection.collectionLog,
      collectionLogTotals: collection.collectionLogTotals,
      recentCollections: collection.recentCollections,
    } : {}),
  });
}
