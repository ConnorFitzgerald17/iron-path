import { createHash, randomBytes } from "node:crypto";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

export interface DeviceIdentity { deviceId: string; characterId: string; }
const LAST_SEEN_WRITE_INTERVAL_MS = 5 * 60_000;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createDeviceToken() {
  return `ipd_${randomBytes(32).toString("base64url")}`;
}

export function shouldRefreshDeviceLastSeen(lastSeenAt: string | null, now = Date.now()) {
  return !lastSeenAt || now - new Date(lastSeenAt).getTime() >= LAST_SEEN_WRITE_INTERVAL_MS;
}

export async function authenticateDevice(request: Request): Promise<DeviceIdentity | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  if (!isSupabaseConfigured()) {
    return token === "demo-device-token" ? { deviceId: "demo-device", characterId: "char-ironvale" } : null;
  }
  const admin = createAdminClient();
  const { data } = await admin.from("plugin_devices").select("id, character_id, last_seen_at, revoked_at").eq("token_hash", hashToken(token)).maybeSingle();
  if (!data || data.revoked_at) return null;
  if (shouldRefreshDeviceLastSeen(data.last_seen_at)) {
    await admin.from("plugin_devices").update({ last_seen_at: new Date().toISOString() }).eq("id", data.id);
  }
  return { deviceId: data.id, characterId: data.character_id };
}
