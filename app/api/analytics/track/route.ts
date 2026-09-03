import { NextResponse } from "next/server";
import { z } from "zod";
import { analyticsEventNames } from "@/lib/analytics/events";
import { createAdminClient, createClient, isSupabaseConfigured } from "@/lib/supabase/server";

const payloadSchema = z.object({
  eventId: z.string().uuid(),
  visitorId: z.string().uuid(),
  sessionId: z.string().uuid(),
  name: z.enum(analyticsEventNames),
  path: z.string().trim().min(1).max(160).regex(/^\/[a-zA-Z0-9/_-]*$/),
  properties: z.object({
    device: z.enum(["desktop", "tablet", "mobile"]).optional(),
    source: z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9.-]+$|^Direct$/).optional(),
    goalKind: z.enum(["quest", "grind", "banked_xp", "skill"]).optional(),
  }).strict().default({}),
}).strict();

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > 4096) return NextResponse.json({ error: "invalid_event" }, { status: 413 });
  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  if (!isSupabaseConfigured()) return new NextResponse(null, { status: 204 });

  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  const event = parsed.data;
  const { error } = await createAdminClient().from("analytics_events").insert({
    event_id: event.eventId,
    user_id: user?.id ?? null,
    visitor_id: event.visitorId,
    session_id: event.sessionId,
    event_name: event.name,
    path: event.path,
    properties: event.properties,
  });

  // A retry of the same browser event is harmless and should not surface as a
  // product error. Other storage errors remain visible to server monitoring.
  if (error && error.code !== "23505") {
    console.error("analytics_event_insert_failed", { code: error.code });
    return NextResponse.json({ error: "analytics_unavailable" }, { status: 503 });
  }
  return new NextResponse(null, { status: 204 });
}
