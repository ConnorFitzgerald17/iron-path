import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Eye, Gem, Shield, Trophy } from "lucide-react";
import { achievementLabel } from "@/lib/achievements";
import { loadPublicAchievement } from "@/lib/server/achievements";
import { ItemImage } from "@/components/item-image";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ publicId: string }> }): Promise<Metadata> {
  const { publicId } = await params;
  const achievement = await loadPublicAchievement(publicId);
  if (!achievement) return { title: "Achievement not found · Iron Path" };
  const title = `${achievement.simulated ? "Test preview — " : ""}${achievement.characterName} — ${achievement.title}`;
  return {
    title,
    description: `${achievement.detail}. Shared through Iron Path.`,
    openGraph: { title, description: achievement.detail, type: "article" },
    twitter: { card: "summary_large_image", title, description: achievement.detail },
  };
}

export default async function AchievementPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const achievement = await loadPublicAchievement(publicId);
  if (!achievement) notFound();
  const date = new Intl.DateTimeFormat("en", { dateStyle: "long", timeStyle: "short" }).format(new Date(achievement.occurredAt));
  return <main className="standalone-showcase achievement-page">
    <nav><Link href="/"><ArrowLeft size={14} /> Iron Path</Link><span><Trophy size={13} /> {achievement.simulated ? "Simulated preview" : "Verified achievement"}</span></nav>
    <section className="achievement-sheet">
      <div className="showcase-runes" />
      <span className="achievement-seal">{achievement.type === "collection_unlock" ? <Gem size={33} /> : <Check size={35} />}</span>
      <small>{achievement.simulated ? "TEST PREVIEW · " : ""}{achievementLabel(achievement.type)}</small>
      {achievement.itemIcon && <ItemImage src={achievement.itemIcon} alt={achievement.title} size={96} />}
      <h1>{achievement.title}</h1>
      <p>{achievement.detail}</p>
      <div className="achievement-owner">
        <span>{achievement.characterName.slice(0, 2).toUpperCase()}</span>
        <div><small>EARNED BY</small><strong>{achievement.characterName}</strong><p>{achievement.accountType} · Combat {achievement.combatLevel} · Total {achievement.totalLevel}</p></div>
      </div>
      <time dateTime={achievement.occurredAt}>{date}</time>
      {achievement.profilePublic && <Link className="achievement-profile-link" href={`/showcase/${achievement.characterSlug}`}><Eye size={14} /> View full Iron Path</Link>}
      <footer><Shield size={15} /> {achievement.simulated ? "Simulated locally · Not real progress" : "Captured from a RuneLite-verified character"}</footer>
    </section>
  </main>;
}
