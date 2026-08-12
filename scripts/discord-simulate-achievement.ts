import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { isLoopbackUrl } from "../lib/local-development";

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function simulate() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cronSecret = process.env.CRON_SECRET;
  const characterName = option("--character");
  const requestedItemId = option("--item-id");
  const appOrigin = option("--origin") ?? "http://localhost:3000";

  if (!isLoopbackUrl(supabaseUrl)) throw new Error("Refusing to simulate against a non-local Supabase database.");
  if (!serviceRoleKey || !cronSecret) throw new Error("Set SUPABASE_SERVICE_ROLE_KEY and CRON_SECRET in .env.local.");
  if (!characterName) throw new Error("Usage: pnpm discord:simulate -- --character <RSN> [--item-id <ID>]");
  if (!isLoopbackUrl(appOrigin)) throw new Error("The simulator dispatch origin must be localhost or another loopback address.");

  const itemId = requestedItemId === undefined ? undefined : Number(requestedItemId);
  if (itemId !== undefined && (!Number.isInteger(itemId) || itemId <= 0)) throw new Error("--item-id must be a positive integer.");

  const admin = createClient(supabaseUrl!, serviceRoleKey, { auth: { persistSession: false } });
  const { data: character, error: characterError } = await admin.from("characters")
    .select("id,name").ilike("name", characterName).limit(1).maybeSingle();
  if (characterError) throw characterError;
  if (!character) throw new Error(`No local character matched ${characterName}.`);

  const { count: clanCount, error: clanError } = await admin.from("discord_guild_memberships")
    .select("guild_id", { count: "exact", head: true }).eq("character_id", character.id);
  if (clanError) throw clanError;
  if (!clanCount) throw new Error(`${character.name} has not joined a configured Discord clan.`);

  let selectedItemId = itemId;
  let sectionKey: string | null = null;
  if (selectedItemId === undefined) {
    const { data: recent, error: recentError } = await admin.from("collection_log_recent_items")
      .select("item_id,section_key").eq("character_id", character.id)
      .order("overview_order", { ascending: true, nullsFirst: false }).limit(1).maybeSingle();
    if (recentError) throw recentError;
    if (!recent) throw new Error("No recent Collection Log item is available. Sync the overview first or pass --item-id.");
    selectedItemId = Number(recent.item_id);
    sectionKey = recent.section_key;
  } else {
    const { data: slot, error: slotError } = await admin.from("collection_log_slots")
      .select("section_key").eq("character_id", character.id).eq("item_id", selectedItemId)
      .order("obtained", { ascending: false }).limit(1).maybeSingle();
    if (slotError) throw slotError;
    sectionKey = slot?.section_key ?? null;
  }

  const { data: event, error: eventError } = await admin.from("achievement_events").insert({
    character_id: character.id,
    type: "collection_unlock",
    occurred_at: new Date().toISOString(),
    payload: { itemId: selectedItemId, sectionKey, simulated: true },
    dedupe_key: `local-simulation:${randomUUID()}`,
  }).select("id,public_id").single();
  if (eventError) throw eventError;

  const response = await fetch(new URL("/api/cron/discord-dispatch", appOrigin), {
    method: "POST",
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  const dispatch = await response.json() as { claimed?: number; sent?: number; failed?: number; error?: string };
  if (!response.ok) throw new Error(`Achievement ${event.id} was queued, but dispatch failed: ${dispatch.error ?? response.status}`);

  console.log(`Simulated item ${selectedItemId} for ${character.name}.`);
  console.log(`Discord dispatch: ${dispatch.sent ?? 0} sent, ${dispatch.failed ?? 0} failed.`);
  console.log(`Achievement ID: ${event.public_id}`);
}

simulate().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
