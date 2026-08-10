import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedUser } from "@/lib/server/app-auth";
import { characterSummary, MAX_CHARACTERS, setActiveCharacterCookie, type CharacterSummaryRow } from "@/lib/server/characters";
import { createAdminClient } from "@/lib/supabase/server";

const createSchema = z.object({
  name: z.string().trim().min(1).max(12),
});

function baseSlug(name: string) {
  const value = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28);
  return value.length >= 3 ? value : `iron-${value || "path"}`;
}

export async function POST(request: Request) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid_character" }, { status: 400 });

  const admin = createAdminClient();
  const { count } = await admin.from("characters").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count ?? 0) >= MAX_CHARACTERS) return NextResponse.json({ error: "character_limit" }, { status: 409 });

  let slug = baseSlug(parsed.data.name);
  const { data: collision } = await admin.from("characters").select("id").eq("slug", slug).maybeSingle();
  if (collision) slug = `${slug.slice(0, 32)}-${crypto.randomUUID().slice(0, 6)}`;
  const { data, error } = await admin.from("characters").insert({
    user_id: user.id,
    name: parsed.data.name,
    slug,
    account_type: "Unknown",
  }).select("id, name, slug, account_type, combat_level, total_level, visibility, last_synced_at, created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const character = characterSummary(data as CharacterSummaryRow);
  const response = NextResponse.json({ character }, { status: 201 });
  setActiveCharacterCookie(response, character.slug);
  return response;
}
