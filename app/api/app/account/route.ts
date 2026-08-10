import { NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/server/app-auth";
import { createAdminClient } from "@/lib/supabase/server";

export async function DELETE() {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
