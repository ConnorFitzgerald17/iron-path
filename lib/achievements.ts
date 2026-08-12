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
  simulated?: boolean;
}

export function achievementLabel(type: AchievementType) {
  return type === "collection_unlock" ? "Collection Log unlock" : "Path completed";
}
