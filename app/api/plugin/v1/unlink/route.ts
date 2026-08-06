import { NextResponse } from "next/server";
import { authenticateDevice } from "@/lib/server/plugin-auth";
import { unauthorized } from "@/lib/server/responses";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const device = await authenticateDevice(request);
  if (!device) return unauthorized();
  if (isSupabaseConfigured()) await createAdminClient().from("plugin_devices").update({ revoked_at: new Date().toISOString() }).eq("id", device.deviceId);
  return NextResponse.json({ revoked: true });
}
