import { NextResponse } from "next/server";
import { dispatchDiscordDeliveries } from "@/lib/server/discord-dispatch";

async function dispatch(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await dispatchDiscordDeliveries());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "dispatch_failed" }, { status: 500 });
  }
}

export const GET = dispatch;
export const POST = dispatch;
