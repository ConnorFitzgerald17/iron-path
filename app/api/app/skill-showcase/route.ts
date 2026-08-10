import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedUser, ownedCharacter } from "@/lib/server/app-auth";
import { skillShowcaseKey } from "@/lib/skill-showcase";
import { createAdminClient } from "@/lib/supabase/server";

const schema = z.object({
  characterId: z.string().uuid(),
  skill: z.union([z.literal("*"), z.string().trim().min(1).max(40).regex(/^[A-Za-z][A-Za-z ]*$/)]),
  public: z.boolean(),
  sortOrder: z.number().int().nonnegative().default(0),
});

export async function PATCH(request: Request) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid_skill" }, { status: 400 });
  if (!await ownedCharacter(parsed.data.characterId, user.id)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const admin = createAdminClient();
  const skillKey = parsed.data.skill === "*" ? "*" : skillShowcaseKey(parsed.data.skill);
  if (skillKey !== "*") {
    const { data, error } = await admin.from("character_skills").select("skill")
      .eq("character_id", parsed.data.characterId).ilike("skill", parsed.data.skill).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "unknown_skill" }, { status: 400 });
  }

  if (!parsed.data.public) {
    const { error } = await admin.from("character_skill_showcase").delete()
      .eq("character_id", parsed.data.characterId).eq("skill_key", skillKey);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { error } = await admin.from("character_skill_showcase").upsert({
    character_id: parsed.data.characterId,
    skill_key: skillKey,
    sort_order: parsed.data.sortOrder,
  }, { onConflict: "character_id,skill_key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
