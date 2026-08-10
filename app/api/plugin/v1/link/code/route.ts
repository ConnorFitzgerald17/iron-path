import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { characterSummary, MAX_CHARACTERS, setActiveCharacterCookie, type CharacterSummaryRow } from "@/lib/server/characters";
import { signupsEnabled } from "@/lib/server/feature-flags";
import { createLinkCode, hashToken, normalizeLinkCode } from "@/lib/server/plugin-auth";
import { unavailable } from "@/lib/server/responses";

const createSchema = z.object({ characterId: z.string().uuid().optional() });
const statusSchema = z.object({ code: z.string().min(6).max(16) });

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return unavailable();
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_character" }, { status: 400 });
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const characterId = parsed.data.characterId;
  if (characterId) {
    const { data: character } = await admin.from("characters").select("id").eq("id", characterId).eq("user_id", user.id).maybeSingle();
    if (!character) return NextResponse.json({ error: "not_found" }, { status: 404 });
  } else {
    const { count } = await admin.from("characters").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    if ((count ?? 0) === 0 && !signupsEnabled()) {
      return NextResponse.json({ error: "signups_closed" }, { status: 403 });
    }
    if ((count ?? 0) >= MAX_CHARACTERS) return NextResponse.json({ error: "character_limit" }, { status: 409 });
    await admin.from("plugin_link_codes").delete().eq("user_id", user.id).is("character_id", null).is("used_at", null);
  }

  const raw = createLinkCode();
  const display = `${raw.slice(0, 4)}-${raw.slice(4)}`;
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  const { error } = await admin.from("plugin_link_codes").insert({
    character_id: characterId ?? null,
    user_id: user.id,
    code_hash: hashToken(raw),
    expires_at: expiresAt,
  });
  if (error) return NextResponse.json({ error: "code_create_failed" }, { status: 500 });
  return NextResponse.json({ code: display, expiresAt });
}

export async function PUT(request: Request) {
  if (!isSupabaseConfigured()) return unavailable();
  const parsed = statusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const codeHash = hashToken(normalizeLinkCode(parsed.data.code));
  const { data: link } = await admin.from("plugin_link_codes")
    .select("character_id, expires_at, used_at")
    .eq("code_hash", codeHash).eq("user_id", user.id).maybeSingle();
  if (!link) return NextResponse.json({ error: "invalid_code" }, { status: 404 });
  if (!link.used_at && new Date(link.expires_at) <= new Date()) {
    return NextResponse.json({ error: "code_expired" }, { status: 410 });
  }
  if (!link.character_id) return NextResponse.json({ status: "waiting", expiresAt: link.expires_at });

  const { data } = await admin.from("characters")
    .select("id, name, slug, account_type, combat_level, total_level, visibility, last_synced_at, created_at")
    .eq("id", link.character_id).eq("user_id", user.id).maybeSingle();
  if (!data) return NextResponse.json({ error: "character_not_found" }, { status: 404 });
  const character = characterSummary(data as CharacterSummaryRow);
  if (!character.lastSyncedAt) return NextResponse.json({ status: "syncing", character });
  const response = NextResponse.json({ status: "complete", character });
  setActiveCharacterCookie(response, character.slug);
  return response;
}
