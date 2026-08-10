import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticatedUser } from "@/lib/server/app-auth";
import { ACTIVE_CHARACTER_COOKIE, characterSummary, clearActiveCharacterCookie, setActiveCharacterCookie, type CharacterSummaryRow } from "@/lib/server/characters";
import { createAdminClient } from "@/lib/supabase/server";

const fields = "id, name, slug, account_type, combat_level, total_level, visibility, last_synced_at, created_at";

async function ownedSummary(characterId: string, userId: string) {
  const { data } = await createAdminClient().from("characters").select(fields)
    .eq("id", characterId).eq("user_id", userId).maybeSingle();
  return data ? characterSummary(data as CharacterSummaryRow) : null;
}

export async function PATCH(_request: Request, { params }: { params: Promise<{ characterId: string }> }) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { characterId } = await params;
  const character = await ownedSummary(characterId, user.id);
  if (!character) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const response = NextResponse.json({ character });
  setActiveCharacterCookie(response, character.slug);
  return response;
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ characterId: string }> }) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { characterId } = await params;
  const character = await ownedSummary(characterId, user.id);
  if (!character) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const admin = createAdminClient();
  const { error } = await admin.from("characters").delete().eq("id", characterId).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data: remainingRows, error: nextError } = await admin.from("characters").select(fields)
    .eq("user_id", user.id).order("created_at");
  if (nextError) return NextResponse.json({ error: nextError.message }, { status: 500 });
  const remaining = (remainingRows ?? []).map((row) => characterSummary(row as CharacterSummaryRow));
  const rememberedSlug = (await cookies()).get(ACTIVE_CHARACTER_COOKIE)?.value;
  const nextCharacter = remaining.find((row) => row.slug === rememberedSlug) ?? remaining[0] ?? null;
  const response = NextResponse.json({ nextCharacter });
  if (nextCharacter) setActiveCharacterCookie(response, nextCharacter.slug);
  else clearActiveCharacterCookie(response);
  return response;
}
