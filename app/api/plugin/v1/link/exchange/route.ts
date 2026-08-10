import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { baseCharacterSlug } from "@/lib/server/characters";
import { signupsEnabled } from "@/lib/server/feature-flags";
import { createDeviceToken, hashToken, normalizeLinkCode } from "@/lib/server/plugin-auth";
import { badRequest } from "@/lib/server/responses";

const bodySchema = z.object({ code: z.string().min(6).max(16), characterName: z.string().trim().min(1).max(12), clientVersion: z.string().max(40).optional() });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid body");
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ token: "demo-device-token", characterId: "char-ironvale", expiresAt: null, demo: true });
  }

  const admin = createAdminClient();
  const normalizedCode = normalizeLinkCode(parsed.data.code);
  const codeHash = hashToken(normalizedCode);
  const { data: link } = await admin.from("plugin_link_codes").select("id, character_id, user_id, expires_at, used_at").eq("code_hash", codeHash).maybeSingle();
  if (!link || link.used_at || new Date(link.expires_at) <= new Date()) return NextResponse.json({ error: "invalid_or_expired_code" }, { status: 401 });

  const token = createDeviceToken();
  if (!link.character_id && link.user_id) {
    if (!signupsEnabled()) {
      const { count, error: countError } = await admin.from("characters")
        .select("id", { count: "exact", head: true })
        .eq("user_id", link.user_id);
      if (countError) return NextResponse.json({ error: "character_lookup_failed" }, { status: 500 });
      if ((count ?? 0) === 0) return NextResponse.json({ error: "signups_closed" }, { status: 403 });
    }
    const { data, error } = await admin.rpc("claim_plugin_enrollment", {
      p_code_hash: codeHash,
      p_character_name: parsed.data.characterName,
      p_base_slug: baseCharacterSlug(parsed.data.characterName),
      p_token_hash: hashToken(token),
      p_client_version: parsed.data.clientVersion ?? null,
    }).single();
    const claim = data as { character_id: string; device_id: string } | null;
    if (error || !claim) {
      if (error?.message.includes("character_limit")) return NextResponse.json({ error: "character_limit" }, { status: 409 });
      if (error?.message.includes("invalid_or_expired_code")) return NextResponse.json({ error: "invalid_or_expired_code" }, { status: 401 });
      return NextResponse.json({ error: "character_create_failed" }, { status: 500 });
    }
    return NextResponse.json({ token, characterId: claim.character_id, expiresAt: null });
  }

  if (!link.character_id) return NextResponse.json({ error: "invalid_or_expired_code" }, { status: 401 });
  const { data: device, error } = await admin.from("plugin_devices").insert({
    character_id: link.character_id,
    token_hash: hashToken(token),
    label: parsed.data.characterName,
    client_version: parsed.data.clientVersion
  }).select("id").single();
  if (error) return NextResponse.json({ error: "device_create_failed" }, { status: 500 });
  await admin.from("plugin_link_codes").update({ used_at: new Date().toISOString(), device_id: device.id }).eq("id", link.id);
  return NextResponse.json({ token, characterId: link.character_id, expiresAt: null });
}
