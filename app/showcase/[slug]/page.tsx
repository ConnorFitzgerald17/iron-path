import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, Shield, Trophy } from "lucide-react";
import { demoProfile } from "@/lib/demo-data";
import { isSupabaseConfigured, createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PublicShowcase({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let character: { name: string; slug: string; account_type: string; combat_level: number; total_level: number; last_synced_at: string | null } | null = null;

  if (slug === demoProfile.slug) {
    character = {
      name: demoProfile.name, slug, account_type: demoProfile.accountType,
      combat_level: demoProfile.combatLevel, total_level: demoProfile.totalLevel,
      last_synced_at: demoProfile.lastSyncedAt ?? null
    };
  } else if (isSupabaseConfigured()) {
    const { data } = await createAdminClient().from("characters").select("name, slug, account_type, combat_level, total_level, last_synced_at").eq("slug", slug).eq("visibility", "public").maybeSingle();
    character = data;
  }
  if (!character) notFound();

  return (
    <main className="standalone-showcase">
      <nav><Link href="/"><ArrowLeft size={14} /> Iron Path</Link><span><Eye size={13} /> Public profile</span></nav>
      <section>
        <div className="showcase-runes" />
        <span className="showcase-avatar">{character.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}</span>
        <small>{character.account_type}</small>
        <h1>{character.name}</h1>
        <p>Combat {character.combat_level} · Total level {character.total_level}</p>
        <div><span><Trophy size={18} /><strong>The trophy case is private.</strong><small>This demo route proves visibility enforcement; publish goals from the journal preview.</small></span></div>
        <footer><Shield size={15} /> Last synced {character.last_synced_at ? new Date(character.last_synced_at).toLocaleString() : "never"}</footer>
      </section>
    </main>
  );
}
