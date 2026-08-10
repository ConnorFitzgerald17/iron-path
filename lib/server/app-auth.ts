import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function authenticatedUser() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  return user;
}

export async function ownedCharacter(characterId: string, userId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("characters").select("id").eq("id", characterId).eq("user_id", userId).maybeSingle();
  return data;
}
