import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { hashToken } from "@/lib/server/plugin-auth";
import { unavailable } from "@/lib/server/responses";

const schema = z.object({ characterId: z.string().uuid() });

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return unavailable();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_character" }, { status: 400 });
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data: character } = await admin.from("characters").select("id").eq("id", parsed.data.characterId).eq("user_id", user.id).maybeSingle();
  if (!character) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const raw = randomBytes(5).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  const display = `${raw.slice(0, 4)}-${raw.slice(4)}`;
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  await admin.from("plugin_link_codes").insert({ character_id: character.id, code_hash: hashToken(raw), expires_at: expiresAt });
  return NextResponse.json({ code: display, expiresAt });
}
