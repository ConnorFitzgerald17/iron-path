import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedUser } from "@/lib/server/app-auth";
import { goalSchema } from "@/lib/server/goal-schema";
import { goalToUpdateRow } from "@/lib/server/profile";
import { createAdminClient } from "@/lib/supabase/server";
import type { Goal } from "@/lib/types";

const schema = z.union([
  z.object({ characterId: z.string().uuid(), goal: goalSchema }),
  z.object({ characterId: z.string().uuid(), status: z.enum(["active", "complete"]) }),
]);

async function ownedGoal(goalId: string, characterId: string, userId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("goals").select("id, characters!inner(user_id)").eq("id", goalId).eq("character_id", characterId).eq("characters.user_id", userId).maybeSingle();
  return data;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ goalId: string }> }) {
  const { goalId } = await params;
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid_goal" }, { status: 400 });
  if (!await ownedGoal(goalId, parsed.data.characterId, user.id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const row = "status" in parsed.data
    ? { status: parsed.data.status }
    : goalToUpdateRow(parsed.data.goal as Goal);
  const { error } = await createAdminClient().from("goals").update({ ...row, updated_at: new Date().toISOString() }).eq("id", goalId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ goalId: string }> }) {
  const { goalId } = await params;
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { characterId?: string } | null;
  if (!body?.characterId || !await ownedGoal(goalId, body.characterId, user.id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { error } = await createAdminClient().from("goals").delete().eq("id", goalId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
