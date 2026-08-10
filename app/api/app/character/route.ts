import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedUser, ownedCharacter } from "@/lib/server/app-auth";
import { createAdminClient } from "@/lib/supabase/server";

const schema = z.object({
  characterId: z.string().uuid(),
  visibility: z.enum(["private", "public"]),
});

export async function PATCH(request: Request) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_character" }, { status: 400 });
  const character = await ownedCharacter(parsed.data.characterId, user.id);
  if (!character) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (parsed.data.visibility === "public" && !character.last_synced_at) {
    return NextResponse.json({ error: "runelite_verification_required" }, { status: 409 });
  }
  const { error } = await createAdminClient().from("characters").update({ visibility: parsed.data.visibility, updated_at: new Date().toISOString() }).eq("id", parsed.data.characterId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
