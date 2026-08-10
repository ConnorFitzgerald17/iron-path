import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, Check, Eye, Shield, Target, Trophy, Zap } from "lucide-react";
import { bankedXp, fullNumber, grindProgress, questReadiness, skillProgress } from "@/lib/calculations";
import { loadCharacterProfile, type CharacterRow } from "@/lib/server/profile";
import { isSupabaseConfigured, createAdminClient } from "@/lib/supabase/server";
import type { CharacterProfile, Goal } from "@/lib/types";
import { ItemImage } from "@/components/item-image";
import { CollectionLogShowcase } from "@/components/collection-log-showcase";

export const dynamic = "force-dynamic";

async function publicProfile(slug: string) {
  if (!isSupabaseConfigured()) return null;
  const { data } = await createAdminClient().from("characters")
    .select("id, name, slug, account_type, combat_level, total_level, visibility, last_synced_at")
    .eq("slug", slug).eq("visibility", "public").maybeSingle();
  if (!data) return null;
  const profile = await loadCharacterProfile(data as CharacterRow, { publicOnly: true });
  return { ...profile, goals: profile.goals.filter((goal) => goal.public) };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const profile = await publicProfile(slug);
  if (!profile) return { title: "Private path · Iron Path" };
  return {
    title: `${profile.name}'s iron path`,
    description: `${profile.name} is showcasing ${profile.goals.length} Old School RuneScape goals.`,
  };
}

function goalSummary(goal: Goal, profile: CharacterProfile) {
  if (goal.kind === "quest") {
    const skills = Object.fromEntries(profile.skills.map((skill) => [skill.skill, skill.level]));
    const value = questReadiness(goal, profile.items, skills);
    return { value: `${value.percent}%`, detail: `${value.ready} of ${value.total} requirements ready`, progress: value.percent };
  }
  if (goal.kind === "grind") {
    const value = grindProgress(goal);
    return { value: `${fullNumber(value.kc)} KC`, detail: value.obtained ? `${value.obtained} target drop${value.obtained === 1 ? "" : "s"}` : `${value.probability.toFixed(1)}% chance seen`, progress: Math.min(100, value.rateProgress) };
  }
  if (goal.kind === "skill") {
    const value = skillProgress(goal);
    return { value: `Level ${goal.currentLevel}`, detail: `${fullNumber(value.remaining)} XP remaining`, progress: value.percent };
  }
  const value = bankedXp(goal);
  return { value: `Level ${value.projectedLevel}`, detail: `${fullNumber(value.banked)} XP banked`, progress: value.percent };
}

function icon(goal: Goal) {
  if (goal.kind === "quest") return <BookOpen size={17} />;
  if (goal.kind === "grind") return <Target size={17} />;
  return <Zap size={17} />;
}

export default async function PublicShowcase({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await publicProfile(slug);
  if (!profile) notFound();

  return (
    <main className="standalone-showcase">
      <nav><Link href="/"><ArrowLeft size={14} /> Iron Path</Link><span><Eye size={13} /> Public profile</span></nav>
      <section className="public-showcase-sheet">
        <div className="showcase-runes" />
        <span className="showcase-avatar">{profile.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}</span>
        <small>{profile.accountType === "Unknown" ? "Awaiting RuneLite" : profile.accountType}</small>
        <h1>{profile.name}</h1>
        <p>Combat {profile.combatLevel} · Total level {profile.totalLevel}</p>
        <div className="public-showcase-stats"><span><Trophy size={16} /><b>{profile.goals.length}</b><small>SHOWCASED PATHS</small></span><span><Shield size={16} /><b>{profile.totalLevel}</b><small>TOTAL LEVEL</small></span><span><Check size={16} /><b>{profile.lastSyncedAt ? new Date(profile.lastSyncedAt).toLocaleDateString("en-GB") : "Manual"}</b><small>LAST UPDATE</small></span></div>
        <div className="public-showcase-goals">
          {profile.goals.map((goal) => {
            const summary = goalSummary(goal, profile);
            return <article key={goal.id}><span className={`goal-kind goal-kind--${goal.kind}`}>{icon(goal)}</span><div><small>{goal.kind.replace("_", " ")}</small><h2>{goal.title}</h2><i><b style={{ width: `${summary.progress}%` }} /></i><p>{summary.detail}</p>{goal.kind === "grind" && <div className="public-drop-row">{goal.drops.filter((drop) => drop.public).map((drop) => <span key={drop.itemId}><ItemImage src={drop.icon} alt={drop.name} size={28} /><b>{drop.quantity}×</b><small>{drop.name}</small></span>)}</div>}</div><strong>{summary.value}</strong></article>;
          })}
          {!profile.goals.length && <div className="public-empty"><Trophy size={24} /><strong>No paths are showcased yet.</strong></div>}
        </div>
        <CollectionLogShowcase sections={profile.collectionLog} />
        <footer><Shield size={15} /> Shared by {profile.name} through Iron Path</footer>
      </section>
    </main>
  );
}
