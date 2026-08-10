import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, Eye, Gem, Shield, Swords, Target, Trophy, Zap } from "lucide-react";
import { bankedXp, fullNumber, grindProgress, questReadiness, skillProgress } from "@/lib/calculations";
import { accountTypeLabel } from "@/lib/character-display";
import { loadPublicProfile } from "@/lib/server/public-profile";
import { visibleShowcaseSkills } from "@/lib/skill-showcase";
import type { CharacterProfile, Goal } from "@/lib/types";
import { ItemImage } from "@/components/item-image";
import { CollectionLogShowcase } from "@/components/collection-log-showcase";
import { SkillShowcase } from "@/components/skill-showcase";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const profile = await loadPublicProfile(slug);
  if (!profile) return { title: "Private path · Iron Path" };
  const title = `${profile.name}'s iron path`;
  const showcasedSkillCount = visibleShowcaseSkills(profile.skills, profile.skillShowcase).length;
  const description = `${profile.name} is showcasing ${profile.goals.length} Old School RuneScape goals and ${showcasedSkillCount} skill stats.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary_large_image", title, description },
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
  const profile = await loadPublicProfile(slug);
  if (!profile) notFound();

  return (
    <main className="standalone-showcase">
      <nav><Link href="/"><ArrowLeft size={14} /> Iron Path</Link><span><Eye size={13} /> Public profile</span></nav>
      <section className="public-showcase-sheet">
        <div className="showcase-runes" />
        <span className="showcase-avatar">{profile.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}</span>
        <small>{accountTypeLabel(profile.accountType, profile.lastSyncedAt)}</small>
        <h1>{profile.name}</h1>
        <p>Combat level {profile.combatLevel} · Total level {profile.totalLevel}</p>
        <div className="public-showcase-stats"><span><Trophy size={16} /><b>{profile.goals.length}</b><small>SHOWCASED PATHS</small></span><span><Gem size={16} /><b>{profile.collectionLogTotals.obtainedCount}/{profile.collectionLogTotals.totalCount}</b><small>COLLECTION LOG</small></span><span><Swords size={16} /><b>{profile.combatLevel}</b><small>COMBAT LEVEL</small></span><span><Shield size={16} /><b>{profile.totalLevel}</b><small>TOTAL LEVEL</small></span></div>
        <SkillShowcase skills={profile.skills} selection={profile.skillShowcase} />
        {profile.goals.length > 0 && <div className="public-showcase-goals">
          {profile.goals.map((goal) => {
            const summary = goalSummary(goal, profile);
            return <article key={goal.id}><span className={`goal-kind goal-kind--${goal.kind}`}>{icon(goal)}</span><div><small>{goal.kind.replace("_", " ")}</small><h2>{goal.title}</h2><i><b style={{ width: `${summary.progress}%` }} /></i><p>{summary.detail}</p>{goal.kind === "grind" && <div className="public-drop-row">{goal.drops.filter((drop) => drop.public).map((drop) => <span key={drop.itemId}><ItemImage src={drop.icon} alt={drop.name} size={28} /><b>{drop.quantity}×</b><small>{drop.name}</small></span>)}</div>}</div><strong>{summary.value}</strong></article>;
          })}
        </div>}
        <CollectionLogShowcase sections={profile.collectionLog} />
        <footer><Shield size={15} /> Shared by {profile.name} through Iron Path</footer>
      </section>
    </main>
  );
}
