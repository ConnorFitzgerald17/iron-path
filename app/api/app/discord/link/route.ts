import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedUser } from "@/lib/server/app-auth";
import { hashLinkToken } from "@/lib/server/discord";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

const schema = z.object({ token: z.string().min(20).max(100) });

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  const { data, error } = await createAdminClient().rpc("consume_discord_link_code", {
    p_user_id: user.id,
    p_token_hash: hashLinkToken(parsed.data.token),
  });
  if (error) return NextResponse.json({ error: "link_failed" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "expired_or_used" }, { status: 410 });
  return NextResponse.json({ ok: true });
}
