import type { CharacterProfile, CharacterSyncState, Goal, OwnedItem, QuestState } from "./types";

function key(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

export function mergeCharacterSyncState(profile: CharacterProfile, state: CharacterSyncState): CharacterProfile {
  const skills = new Map(state.skills.map((skill) => [key(skill.skill), skill]));
  const quests = new Map(state.quests.map((quest) => [key(quest.quest), quest.state as QuestState]));
  const statuses = new Map(state.goals.map((goal) => [goal.id, goal.status]));
  const metadata = new Map(profile.items.map((item) => [item.itemId, item]));
  const items: OwnedItem[] = state.items.map((item) => ({
    ...item,
    name: metadata.get(item.itemId)?.name ?? `Item ${item.itemId}`,
    icon: metadata.get(item.itemId)?.icon,
  }));
  const goals = profile.goals.map((goal): Goal => {
    const status = statuses.get(goal.id) ?? goal.status;
    if (goal.kind === "quest") return {
      ...goal,
      status,
      state: quests.get(key(goal.title)) ?? goal.state,
      prerequisites: goal.prerequisites.map((quest) => ({ ...quest, state: quests.get(key(quest.name)) ?? quest.state })),
    };
    if (goal.kind === "skill") {
      const skill = skills.get(key(goal.skill));
      const currentXp = skill?.xp ?? goal.currentXp;
      return { ...goal, currentLevel: skill?.level ?? goal.currentLevel, currentXp, status: currentXp >= goal.targetXp ? "complete" : "active" };
    }
    if (goal.kind === "banked_xp") {
      const skill = skills.get(key(goal.skill));
      return { ...goal, currentLevel: skill?.level ?? goal.currentLevel, currentXp: skill?.xp ?? goal.currentXp, status };
    }
    return { ...goal, status };
  });
  return {
    ...profile,
    name: state.character.name,
    slug: state.character.slug,
    accountType: state.character.accountType,
    combatLevel: state.character.combatLevel,
    totalLevel: state.character.totalLevel,
    visibility: state.character.visibility,
    lastSyncedAt: state.character.lastSyncedAt,
    skills: state.skills,
    items,
    goals,
  };
}
