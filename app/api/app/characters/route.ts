import { NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/server/app-auth";

export async function POST() {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ error: "runelite_verification_required" }, { status: 409 });
}
