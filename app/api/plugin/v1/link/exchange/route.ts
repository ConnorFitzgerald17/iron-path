import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createDeviceToken, hashToken } from "@/lib/server/plugin-auth";
import { badRequest } from "@/lib/server/responses";

const bodySchema = z.object({ code: z.string().min(6).max(16), characterName: z.string().min(1).max(12), clientVersion: z.string().max(40).optional() });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid body");
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ token: "demo-device-token", characterId: "char-ironvale", expiresAt: null, demo: true });
  }

  const admin = createAdminClient();
  const normalizedCode = parsed.data.code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const { data: link } = await admin.from("plugin_link_codes").select("id, character_id, expires_at, used_at").eq("code_hash", hashToken(normalizedCode)).maybeSingle();
  if (!link || link.used_at || new Date(link.expires_at) <= new Date()) return NextResponse.json({ error: "invalid_or_expired_code" }, { status: 401 });

  const token = createDeviceToken();
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
