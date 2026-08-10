import type { SkillShowcaseSelection, SkillSnapshot } from "./types";

export const OSRS_SKILL_ORDER = [
  "Attack", "Hitpoints", "Mining", "Strength", "Agility", "Smithing", "Defence", "Herblore",
  "Fishing", "Ranged", "Thieving", "Cooking", "Prayer", "Crafting", "Firemaking", "Magic",
  "Fletching", "Woodcutting", "Runecraft", "Slayer", "Farming", "Construction", "Hunter",
];

const skillOrder = new Map(OSRS_SKILL_ORDER.map((skill, index) => [skill.toLowerCase(), index]));

export function skillShowcaseKey(skill: string): string {
  return skill.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

export function sortedSkills(skills: SkillSnapshot[]): SkillSnapshot[] {
  return [...skills].sort((a, b) => {
    const aKey = skillShowcaseKey(a.skill);
    const bKey = skillShowcaseKey(b.skill);
    return (skillOrder.get(aKey) ?? OSRS_SKILL_ORDER.length) - (skillOrder.get(bKey) ?? OSRS_SKILL_ORDER.length)
      || a.skill.localeCompare(b.skill);
  });
}

export function visibleShowcaseSkills(skills: SkillSnapshot[], selection: SkillShowcaseSelection): SkillSnapshot[] {
  const selected = new Set(selection.skills.map(skillShowcaseKey));
  return sortedSkills(skills).filter((skill) => selection.all || selected.has(skillShowcaseKey(skill.skill)));
}
