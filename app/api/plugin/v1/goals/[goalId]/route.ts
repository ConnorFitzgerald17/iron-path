import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateDevice } from "@/lib/server/plugin-auth";
import { unauthorized, unavailable } from "@/lib/server/responses";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

const schema = z.object({ status: z.enum(["active", "complete"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ goalId: string }> }) {
  const device = await authenticateDevice(request);
  if (!device) return unauthorized();
  if (!isSupabaseConfigured()) return unavailable();

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_status" }, { status: 400 });

  const { goalId } = await params;
  const admin = createAdminClient();
  const { data: goal } = await admin.from("goals").select("id")
    .eq("id", goalId)
    .eq("character_id", device.characterId)
    .eq("archived", false)
    .maybeSingle();
  if (!goal) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { error } = await admin.from("goals").update({
    status: parsed.data.status,
    updated_at: new Date().toISOString(),
  }).eq("id", goalId).eq("character_id", device.characterId);
  if (error) return NextResponse.json({ error: "goal_update_failed" }, { status: 500 });
  return NextResponse.json({ ok: true, status: parsed.data.status });
}
