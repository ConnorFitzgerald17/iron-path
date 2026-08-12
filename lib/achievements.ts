export type AchievementType = "collection_unlock" | "goal_complete";

export interface Achievement {
  id: number;
  publicId: string;
  characterId: string;
  characterName: string;
  characterSlug: string;
  accountType: string;
  combatLevel: number;
  totalLevel: number;
  profilePublic: boolean;
  type: AchievementType;
  occurredAt: string;
  title: string;
  detail: string;
  itemId?: number;
  itemIcon?: string;
  collectionObtained?: number;
  collectionTotal?: number;
  simulated?: boolean;
}

export function achievementLabel(type: AchievementType) {
  return type === "collection_unlock" ? "Collection Log unlock" : "Path completed";
}

export function collectionLogProgress(obtained: number, total: number) {
  const percentage = total > 0 ? (obtained / total) * 100 : 0;
  return `${obtained.toLocaleString("en-GB")} / ${total.toLocaleString("en-GB")} unlocked (${percentage.toFixed(1)}%)`;
}

export function collectionLogAttributionDetail(sectionName?: string, lootSourceName?: string) {
  if (lootSourceName) return `Loot source: ${lootSourceName}`;
  return sectionName ? `Collection Log section: ${sectionName}` : "Added to the Collection Log";
}
