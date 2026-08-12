import { Gem, Sparkles, Swords } from "lucide-react";
import type { CollectionLogSection, KillCountSnapshot, RecentCollectionItem } from "@/lib/types";
import { fullNumber } from "@/lib/calculations";
import { killCountsForCollectionSection } from "@/lib/kill-count-showcase";
import { ItemImage } from "./item-image";

export function collectionLogShowcaseSummary(sections: CollectionLogSection[]) {
  const visibleSections = sections.filter((section) => section.public);
  const pinned = sections.flatMap((section) => section.slots.filter((slot) => slot.public && slot.obtained).map((slot) => ({ ...slot, section: section.name })));
  return {
    visibleSections,
    pinned,
    obtainedCount: visibleSections.reduce((sum, section) => sum + section.obtainedCount, 0),
    totalCount: visibleSections.reduce((sum, section) => sum + section.totalCount, 0),
  };
}

export function CollectionLogShowcase({ sections, killCounts = [], recentCollections = [], showRecent = false }: { sections: CollectionLogSection[]; killCounts?: KillCountSnapshot[]; recentCollections?: RecentCollectionItem[]; showRecent?: boolean }) {
  const { visibleSections, pinned, obtainedCount, totalCount } = collectionLogShowcaseSummary(sections);
  const latest = showRecent ? recentCollections.slice(0, 3) : [];
  const recentIds = new Set(latest.map((item) => item.itemId));
  const manualPins = pinned.filter((slot) => !recentIds.has(slot.itemId));
  if (!visibleSections.length && !manualPins.length && !latest.length) return null;
  return <section className="collection-showcase">
    <header><span><Gem size={15} /> COLLECTION LOG</span><small>{totalCount > 0 ? `${obtainedCount}/${totalCount} logged · ` : ""}{visibleSections.length} sections</small></header>
    {latest.length > 0 && <div className="collection-recent-shelf"><header><span><Sparkles size={13} /> LATEST COLLECTIONS</span><small>From the in-game overview</small></header><div>{latest.map((item) => {
      return <article key={item.itemId}><ItemImage src={item.icon} alt={item.name} size={42} /><strong>{item.name}</strong></article>;
    })}</div></div>}
    {manualPins.length > 0 && <div className="collection-trophy-shelf">{manualPins.map((slot) => <article key={`${slot.section}-${slot.itemId}`}><ItemImage src={slot.icon} alt={slot.name} size={42} /><strong>{slot.name}</strong><small>{slot.quantity}× · {slot.section}</small></article>)}</div>}
    <div className="collection-section-list">{visibleSections.sort((a, b) => a.sortOrder - b.sortOrder).map((section) => {
      const slots = section.displayMode === "unlocked" ? section.slots.filter((slot) => slot.obtained) : section.slots;
      const sectionKillCounts = killCountsForCollectionSection(section, killCounts);
      const greenLogged = section.totalCount > 0 && section.obtainedCount >= section.totalCount;
      return <article className={`collection-section collection-section--${section.displayMode}${greenLogged ? " green-logged" : ""}`} key={section.key}>
        <header><span><small>{section.category}</small><strong>{section.name}</strong></span><em>{section.obtainedCount}/{section.totalCount}</em></header>
        <i><b style={{ width: `${Math.round(section.obtainedCount / Math.max(1, section.totalCount) * 100)}%` }} /></i>
        {sectionKillCounts.length > 0 && <div className="collection-section-kc">{sectionKillCounts.map((kill) => <span key={kill.sourceName}><Swords size={12} /><small>{kill.sourceName}</small><strong>{fullNumber(kill.count)} KC</strong></span>)}</div>}
        {section.displayMode !== "summary" && <div className="collection-showcase-slots">{slots.map((slot) => <span className={slot.obtained ? "obtained" : "locked"} key={slot.itemId}><ItemImage src={slot.icon} alt={slot.name} size={37} />{slot.obtained && <b>{slot.quantity}×</b>}<small>{slot.name}</small></span>)}</div>}
      </article>;
    })}</div>
  </section>;
}
