import { cache } from "react";
import { loadCharacterProfile, type CharacterRow } from "@/lib/server/profile";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const loadPublicProfile = cache(async (slug: string) => {
  if (!isSupabaseConfigured()) return null;
  const { data } = await createAdminClient().from("characters")
    .select("id, name, slug, account_type, combat_level, total_level, visibility, last_synced_at")
    .eq("slug", slug).eq("visibility", "public").not("last_synced_at", "is", null).maybeSingle();
  if (!data) return null;
  const profile = await loadCharacterProfile(data as CharacterRow, { publicOnly: true });
  return { ...profile, goals: profile.goals.filter((goal) => goal.public) };
});
