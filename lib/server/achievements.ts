import { cache } from "react";
import type { Achievement, AchievementType } from "@/lib/achievements";
import { runeLiteItemIcon } from "@/lib/icons";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

type AchievementRow = {
  id: number;
  public_id: string;
  character_id: string;
  type: AchievementType;
  occurred_at: string;
  payload: Record<string, unknown>;
  characters: {
    name: string;
    slug: string;
    account_type: string;
    combat_level: number;
    total_level: number;
    visibility: "private" | "public";
  };
};

async function hydrateAchievement(row: AchievementRow): Promise<Achievement> {
  const itemId = row.type === "collection_unlock" ? Number(row.payload.itemId) : undefined;
  let itemName: string | undefined;
  if (itemId) {
    const { data } = await createAdminClient().from("catalog_items").select("name").eq("item_id", itemId).maybeSingle();
    itemName = data?.name ? String(data.name) : `Item ${itemId}`;
  }
  const title = row.type === "collection_unlock" ? (itemName ?? "Collection item") : String(row.payload.title ?? "Completed path");
  const section = String(row.payload.sectionKey ?? "").replace(/[_-]+/g, " ");
  const kind = String(row.payload.kind ?? "goal").replace(/_/g, " ");
  return {
    id: Number(row.id),
    publicId: row.public_id,
    characterId: row.character_id,
    characterName: row.characters.name,
    characterSlug: row.characters.slug,
    accountType: row.characters.account_type,
    combatLevel: Number(row.characters.combat_level),
    totalLevel: Number(row.characters.total_level),
    profilePublic: row.characters.visibility === "public",
    type: row.type,
    occurredAt: row.occurred_at,
    title,
    detail: row.type === "collection_unlock" ? (section ? `Unlocked in ${section}` : "Added to the Collection Log") : `Completed ${kind} path`,
    itemId,
    itemIcon: itemId ? runeLiteItemIcon(itemId) : undefined,
    simulated: row.payload.simulated === true,
  };
}

const select = "id, public_id, character_id, type, occurred_at, payload, characters!inner(name, slug, account_type, combat_level, total_level, visibility)";

export const loadPublicAchievement = cache(async (publicId: string) => {
  if (!isSupabaseConfigured()) return null;
  const { data } = await createAdminClient().from("achievement_events").select(select).eq("public_id", publicId).maybeSingle();
  return data ? hydrateAchievement(data as unknown as AchievementRow) : null;
});

export async function loadAchievementById(id: number) {
  const { data } = await createAdminClient().from("achievement_events").select(select).eq("id", id).maybeSingle();
  return data ? hydrateAchievement(data as unknown as AchievementRow) : null;
}
