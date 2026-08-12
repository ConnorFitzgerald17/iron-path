import { IronPathApp } from "@/components/iron-path-app";
import { CharacterOnboarding } from "@/components/character-onboarding";
import { SignupClosed } from "@/components/signup-closed";
import { loadCharacterProfile, type CharacterRow } from "@/lib/server/profile";
import { ACTIVE_CHARACTER_COOKIE, characterSummary, chooseCharacter, type CharacterSummaryRow } from "@/lib/server/characters";
import { createAdminClient, createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { signupsEnabled } from "@/lib/server/feature-flags";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ character?: string | string[] }> }) {
  if (!isSupabaseConfigured()) return <IronPathApp mode="demo" />;

  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows, error } = await createAdminClient().from("characters")
    .select("id, name, slug, account_type, combat_level, total_level, visibility, last_synced_at, show_recent_collections, collection_log_obtained_count, collection_log_total_count, created_at")
    .eq("user_id", user.id).order("created_at");
  if (error) throw new Error(error.message);
  if (!rows?.length) return signupsEnabled() ? <CharacterOnboarding /> : <SignupClosed />;

  const characters = rows.map((row) => characterSummary(row as CharacterSummaryRow));
  const requested = (await searchParams).character;
  const requestedSlug = Array.isArray(requested) ? requested[0] : requested;
  const rememberedSlug = (await cookies()).get(ACTIVE_CHARACTER_COOKIE)?.value;
  const selected = chooseCharacter(characters, requestedSlug, rememberedSlug);
  const row = rows.find((character) => character.id === selected.id)!;
  const profile = await loadCharacterProfile(row as CharacterRow);
  return <IronPathApp key={profile.id} mode="connected" initialProfile={profile} characters={characters} />;
}
