import { Gem } from "lucide-react";
import type { CollectionLogSection } from "@/lib/types";
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

export function CollectionLogShowcase({ sections }: { sections: CollectionLogSection[] }) {
  const { visibleSections, pinned, obtainedCount, totalCount } = collectionLogShowcaseSummary(sections);
  if (!visibleSections.length && !pinned.length) return null;
  return <section className="collection-showcase">
    <header><span><Gem size={15} /> COLLECTION LOG</span><small>{totalCount > 0 ? `${obtainedCount}/${totalCount} logged · ` : ""}{pinned.length} pinned</small></header>
    {pinned.length > 0 && <div className="collection-trophy-shelf">{pinned.map((slot) => <article key={`${slot.section}-${slot.itemId}`}><ItemImage src={slot.icon} alt={slot.name} size={42} /><strong>{slot.name}</strong><small>{slot.quantity}× · {slot.section}</small></article>)}</div>}
    <div className="collection-section-list">{visibleSections.sort((a, b) => a.sortOrder - b.sortOrder).map((section) => {
      const slots = section.displayMode === "unlocked" ? section.slots.filter((slot) => slot.obtained) : section.slots;
      return <article className={`collection-section collection-section--${section.displayMode}`} key={section.key}>
        <header><span><small>{section.category}</small><strong>{section.name}</strong></span><em>{section.obtainedCount}/{section.totalCount}</em></header>
        <i><b style={{ width: `${Math.round(section.obtainedCount / Math.max(1, section.totalCount) * 100)}%` }} /></i>
        {section.displayMode !== "summary" && <div>{slots.map((slot) => <span className={slot.obtained ? "obtained" : "locked"} key={slot.itemId}><ItemImage src={slot.icon} alt={slot.name} size={37} />{slot.obtained && <b>{slot.quantity}×</b>}<small>{slot.name}</small></span>)}</div>}
      </article>;
    })}</div>
  </section>;
}
