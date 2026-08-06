import { NextResponse } from "next/server";
import { demoProfile } from "@/lib/demo-data";
import { authenticateDevice } from "@/lib/server/plugin-auth";
import { unauthorized } from "@/lib/server/responses";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const device = await authenticateDevice(request);
  if (!device) return unauthorized();
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ characterName: demoProfile.name, goals: demoProfile.goals.map((goal) => ({ id: goal.id, kind: goal.kind, title: goal.title, public: goal.public })) });
  }
  const admin = createAdminClient();
  const [{ data: character }, { data: goals }] = await Promise.all([
    admin.from("characters").select("name").eq("id", device.characterId).single(),
    admin.from("goals").select("id, kind, title, is_public, status, settings").eq("character_id", device.characterId).eq("archived", false).order("sort_order")
  ]);
  return NextResponse.json({ characterName: character?.name, goals: goals ?? [] });
}
