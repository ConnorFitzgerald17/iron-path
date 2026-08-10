import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedUser, ownedCharacter } from "@/lib/server/app-auth";
import { goalSchema } from "@/lib/server/goal-schema";
import { goalToRow, rowToGoal, type GoalRow } from "@/lib/server/profile";
import { createAdminClient } from "@/lib/supabase/server";
import type { Goal } from "@/lib/types";

const schema = z.object({ characterId: z.string().uuid(), goal: goalSchema });

export async function POST(request: Request) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid_goal" }, { status: 400 });
  if (!await ownedCharacter(parsed.data.characterId, user.id)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const admin = createAdminClient();
  const { data: last } = await admin.from("goals").select("sort_order").eq("character_id", parsed.data.characterId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const row = goalToRow(parsed.data.goal as Goal);
  const { data, error } = await admin.from("goals").insert({
    character_id: parsed.data.characterId,
    ...row,
    sort_order: (last?.sort_order ?? -1) + 1,
  }).select("id, kind, title, is_public, status, settings").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ goal: rowToGoal(data as GoalRow) }, { status: 201 });
}
