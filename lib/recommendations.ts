import { ownedQuantity, xpForLevel } from "./calculations";
import type { CharacterProfile, QuestGoal, SkillGoal } from "./types";
import { defaultMethodIds } from "./xp-catalog";

export type RecommendationKind = "skill" | "quest" | "item";

export interface QuestRecommendation {
  id: string;
  kind: RecommendationKind;
  title: string;
  detail: string;
  sourceGoalId: string;
  sourceGoalTitle: string;
  existingGoalId?: string;
  skill?: string;
  targetLevel?: number;
  quest?: string;
  itemId?: number;
  itemName?: string;
  missingQuantity?: number;
  rank: number;
}

function blockerCount(goal: QuestGoal, profile: CharacterProfile) {
  const levels = new Map(profile.skills.map((skill) => [skill.skill.toLowerCase(), skill.level]));
  return goal.requirements.filter((row) => (levels.get(row.skill.toLowerCase()) ?? 1) < row.level).length
    + goal.prerequisites.filter((row) => row.state !== "finished").length
    + goal.items.filter((row) => row.manual ? !row.complete : ownedQuantity(profile.items, row.itemId) < row.quantity).length;
}

export function questRecommendations(profile: CharacterProfile): QuestRecommendation[] {
  const skillLevels = new Map(profile.skills.map((skill) => [skill.skill.toLowerCase(), skill]));
  const activeQuests = profile.goals.filter((goal): goal is QuestGoal => goal.kind === "quest" && goal.status !== "complete")
    .map((goal, index) => ({ goal, index, blockers: blockerCount(goal, profile) }))
    .sort((a, b) => a.blockers - b.blockers || a.index - b.index);
  const rows: QuestRecommendation[] = [];
  const seen = new Set<string>();

  for (const [questRank, entry] of activeQuests.entries()) {
    const base = questRank * 10_000;
    for (const [index, prerequisite] of entry.goal.prerequisites.filter((row) => row.state !== "finished").entries()) {
      const key = `quest:${prerequisite.name.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const existing = profile.goals.find((goal) => goal.kind === "quest" && goal.title.toLowerCase() === prerequisite.name.toLowerCase());
      rows.push({ id: key, kind: "quest", title: prerequisite.name, detail: `Required for ${entry.goal.title}`, sourceGoalId: entry.goal.id, sourceGoalTitle: entry.goal.title, quest: prerequisite.name, existingGoalId: existing?.id, rank: base + index });
    }
    const missingSkills = entry.goal.requirements.map((requirement) => ({ requirement, current: skillLevels.get(requirement.skill.toLowerCase()) }))
      .filter(({ requirement, current }) => (current?.level ?? 1) < requirement.level)
      .sort((a, b) => (xpForLevel(a.requirement.level) - (a.current?.xp ?? 0)) - (xpForLevel(b.requirement.level) - (b.current?.xp ?? 0)));
    for (const [index, { requirement, current }] of missingSkills.entries()) {
      const key = `skill:${requirement.skill.toLowerCase()}:${requirement.level}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const existing = profile.goals.find((goal): goal is SkillGoal => goal.kind === "skill" && goal.skill.toLowerCase() === requirement.skill.toLowerCase() && goal.targetLevel >= requirement.level);
      rows.push({ id: key, kind: "skill", title: `${requirement.level} ${requirement.skill}`, detail: `${Math.max(0, xpForLevel(requirement.level) - (current?.xp ?? 0)).toLocaleString("en-GB")} XP remaining for ${entry.goal.title}`, sourceGoalId: entry.goal.id, sourceGoalTitle: entry.goal.title, skill: requirement.skill, targetLevel: requirement.level, existingGoalId: existing?.id, rank: base + 1000 + index });
    }
    for (const [index, item] of entry.goal.items.entries()) {
      const owned = item.manual ? (item.complete ? item.quantity : 0) : ownedQuantity(profile.items, item.itemId);
      if (owned >= item.quantity) continue;
      const key = `item:${item.itemId ?? item.name.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ id: key, kind: "item", title: item.name, detail: `Need ${item.quantity - owned} more for ${entry.goal.title}`, sourceGoalId: entry.goal.id, sourceGoalTitle: entry.goal.title, itemId: item.itemId, itemName: item.name, missingQuantity: item.quantity - owned, rank: base + 2000 + index });
    }
  }
  return rows.sort((a, b) => a.rank - b.rank);
}

export function skillGoalFromRecommendation(recommendation: QuestRecommendation, profile: CharacterProfile): SkillGoal {
  const skill = recommendation.skill!;
  const targetLevel = recommendation.targetLevel!;
  const current = profile.skills.find((row) => row.skill.toLowerCase() === skill.toLowerCase());
  const methodIds = defaultMethodIds(skill, current?.level ?? 1);
  return {
    id: `skill-${skill.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${targetLevel}-${Date.now()}`,
    kind: "skill",
    title: `Train ${targetLevel} ${skill}`,
    skill,
    targetLevel,
    targetXp: xpForLevel(targetLevel),
    currentLevel: current?.level ?? 1,
    currentXp: current?.xp ?? 0,
    sourceGoals: [{ goalId: recommendation.sourceGoalId, title: recommendation.sourceGoalTitle, requiredLevel: targetLevel }],
    bankedPlan: methodIds.length ? { selectedMethodIds: methodIds, includeOutputs: true, respectLevels: true, showSecondaries: true } : undefined,
    public: false,
    status: (current?.xp ?? 0) >= xpForLevel(targetLevel) ? "complete" : "active",
  };
}
