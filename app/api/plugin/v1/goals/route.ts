import { NextResponse } from "next/server";
import { demoProfile } from "@/lib/demo-data";
import { authenticateDevice } from "@/lib/server/plugin-auth";
import { unauthorized } from "@/lib/server/responses";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const device = await authenticateDevice(request);
  if (!device) return unauthorized();
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      characterName: demoProfile.name,
      goals: demoProfile.goals.map((goal) => {
        const { id, kind, title, public: isPublic, status = "active", ...settings } = goal;
        return { id, kind, title, isPublic, status, settings };
      }),
    });
  }
  const admin = createAdminClient();
  const [characterResult, goalsResult] = await Promise.all([
    admin.from("characters").select("name").eq("id", device.characterId).single(),
    admin.from("goals").select("id, kind, title, is_public, status, settings").eq("character_id", device.characterId).eq("archived", false).order("sort_order")
  ]);
  if (characterResult.error || goalsResult.error) {
    return NextResponse.json({ error: "goal_fetch_failed" }, { status: 500 });
  }
  return NextResponse.json({
    characterName: characterResult.data?.name,
    goals: (goalsResult.data ?? []).map((goal) => ({
      id: goal.id,
      kind: goal.kind,
      title: goal.title,
      isPublic: goal.is_public,
      status: goal.status,
      settings: goal.settings,
    })),
  });
}
