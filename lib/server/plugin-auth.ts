import { createHash, randomBytes } from "node:crypto";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

export interface DeviceIdentity { deviceId: string; characterId: string; }

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createDeviceToken() {
  return `ipd_${randomBytes(32).toString("base64url")}`;
}

export async function authenticateDevice(request: Request): Promise<DeviceIdentity | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  if (!isSupabaseConfigured()) {
    return token === "demo-device-token" ? { deviceId: "demo-device", characterId: "char-ironvale" } : null;
  }
  const admin = createAdminClient();
  const { data } = await admin.from("plugin_devices").select("id, character_id, revoked_at").eq("token_hash", hashToken(token)).maybeSingle();
  if (!data || data.revoked_at) return null;
  await admin.from("plugin_devices").update({ last_seen_at: new Date().toISOString() }).eq("id", data.id);
  return { deviceId: data.id, characterId: data.character_id };
}
