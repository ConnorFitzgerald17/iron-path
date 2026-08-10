import { NextResponse } from "next/server";
import { syncWikiCatalog } from "@/lib/wiki/catalog";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const maxDuration = 300;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  try {
    return NextResponse.json({ ok: true, counts: await syncWikiCatalog() });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : error && typeof error === "object" && "message" in error && typeof error.message === "string"
        ? error.message
        : "catalog_sync_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
