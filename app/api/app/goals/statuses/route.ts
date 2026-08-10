import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedUser, ownedCharacter } from "@/lib/server/app-auth";
import { createAdminClient } from "@/lib/supabase/server";

const characterIdSchema = z.string().uuid();

export async function GET(request: Request) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const characterId = characterIdSchema.safeParse(new URL(request.url).searchParams.get("characterId"));
  if (!characterId.success) return NextResponse.json({ error: "invalid_character" }, { status: 400 });
  if (!await ownedCharacter(characterId.data, user.id)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data, error } = await createAdminClient().from("goals")
    .select("id, status")
    .eq("character_id", characterId.data)
    .eq("archived", false);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ goals: data ?? [] });
}
